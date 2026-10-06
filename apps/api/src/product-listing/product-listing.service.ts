import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { SnapshotStore } from '../_lib/snapshot-store';
import {
  AdminProductsRepository,
  buildProductDto,
} from '../admin-products/admin-products.repository';
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { ListingAIService, readRasterDataUrl } from './listing-ai.service';
import { emptyDraft, followUp, guidedPatch, missingFields, priceMinor } from './listing-rules';
import { ListingPatchBody } from './product-listing.dto';

import type {
  AdminProductDto,
  AdminUserDto,
  ListingDraft,
  ProductListingSession,
  StorageProvider,
} from '@custom-merch/shared';

const KIND = 'product_listing';

@Injectable()
export class ProductListingService implements OnModuleInit {
  private readonly sessions = new Map<string, ProductListingSession>();
  private readonly busy = new Set<string>();
  private readonly committingSlugs = new Set<string>();
  constructor(
    private readonly snapshots: SnapshotStore,
    private readonly products: AdminProductsRepository,
    private readonly ai: ListingAIService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly audit: AuditLogsRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<ProductListingSession>(KIND);
    for (const row of rows) this.sessions.set(row.entityId, row.data);
  }

  list(actor: AdminUserDto) {
    return [...this.sessions.values()]
      .filter((s) => s.ownerId === actor.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 50)
      .map((s) => ({
        id: s.id,
        name: s.draft.nameZh || s.draft.nameEn || s.id.slice(0, 8),
        state: s.state,
        updatedAt: s.updatedAt,
      }));
  }

  get(id: string, actor: AdminUserDto): ProductListingSession {
    const session = this.sessions.get(id);
    if (!session || session.ownerId !== actor.id) throw new NotFoundException('Listing not found');
    return structuredClone(session);
  }

  async create(actor: AdminUserDto, locale = 'zh-CN'): Promise<ProductListingSession> {
    if (
      [...this.sessions.values()].filter((s) => s.ownerId === actor.id && s.state === 'collecting')
        .length >= 100
    )
      throw new BadRequestException('Too many unfinished listings');
    const now = new Date().toISOString();
    const s: ProductListingSession = {
      id: randomUUID(),
      ownerId: actor.id,
      revision: 0,
      locale,
      state: 'collecting',
      draft: emptyDraft(),
      images: [],
      selectedImageIds: [],
      mainImageId: null,
      messages: [
        {
          role: 'assistant',
          text:
            locale === 'zh-CN'
              ? '这次上架什么商品？请先提供名称、材质、颜色/尺码和售价，再上传商品图片。'
              : 'Which product are you listing? Please provide its name, material, colors/sizes and price, then upload product photos.',
          at: now,
        },
      ],
      productId: null,
      source: 'guided',
      missing: [],
      createdAt: now,
      updatedAt: now,
    };
    await this.save(s);
    return s;
  }

  message(id: string, revision: number, message: string, actor: AdminUserDto) {
    return this.mutate(id, revision, actor, async (s) => {
      if (s.messages.length >= 80)
        throw new BadRequestException(
          'Conversation limit reached; edit the product fields directly',
        );
      const aiPatch = await this.ai.extract(message);
      const patch = { ...(aiPatch ?? {}), ...guidedPatch(message) };
      this.patchDraft(s, patch);
      s.source = aiPatch ? 'doubao' : 'guided';
      s.messages.push({ role: 'user', text: message, at: new Date().toISOString() });
      s.messages.push({ role: 'assistant', text: followUp(s), at: new Date().toISOString() });
    });
  }

  patch(id: string, revision: number, patch: Partial<ListingDraft>, actor: AdminUserDto) {
    return this.mutate(id, revision, actor, async (s) => {
      this.patchDraft(s, patch);
    });
  }

  upload(id: string, revision: number, name: string, dataUrl: string, actor: AdminUserDto) {
    return this.mutate(id, revision, actor, async (s) => {
      if (s.images.length >= 16 || s.selectedImageIds.length >= 8)
        throw new BadRequestException('Image limit reached');
      this.assertStorage();
      const { body, contentType } = readRasterDataUrl(dataUrl);
      const stored = await this.storeImage(id, body, contentType);
      const imageId = randomUUID();
      s.images.push({
        id: imageId,
        name,
        url: stored.url,
        originalId: null,
        mode: 'original',
        approved: true,
      });
      s.selectedImageIds.push(imageId);
      s.mainImageId ??= imageId;
      s.messages.push({ role: 'assistant', text: followUp(s), at: new Date().toISOString() });
    });
  }

  enhance(
    id: string,
    revision: number,
    imageId: string,
    mode: 'studio' | 'clean',
    actor: AdminUserDto,
  ) {
    return this.mutate(id, revision, actor, async (s) => {
      if (s.images.length >= 16) throw new BadRequestException('Image limit reached');
      this.assertStorage();
      const source = s.images.find((im) => im.id === imageId && !im.originalId);
      if (!source) throw new NotFoundException('Original image not found');
      const output = await this.ai.enhance(source, mode, actor.id);
      const stored = await this.storeImage(id, output.body, output.contentType);
      s.images.push({
        id: randomUUID(),
        name: source.name,
        url: stored.url,
        originalId: source.id,
        mode,
        approved: false,
      });
    });
  }

  selectImages(
    id: string,
    revision: number,
    selectedImageIds: string[],
    mainImageId: string | null | undefined,
    approveImageId: string | undefined,
    actor: AdminUserDto,
  ) {
    return this.mutate(id, revision, actor, async (s) => {
      if (selectedImageIds.some((imageId) => !s.images.some((im) => im.id === imageId)))
        throw new BadRequestException('Unknown image');
      if (mainImageId && !selectedImageIds.includes(mainImageId))
        throw new BadRequestException('Main image must be selected');
      if (approveImageId) {
        const image = s.images.find((im) => im.id === approveImageId);
        if (!image) throw new BadRequestException('Unknown image');
        image.approved = true;
      }
      s.selectedImageIds = selectedImageIds;
      s.mainImageId = mainImageId ?? selectedImageIds[0] ?? null;
    });
  }

  async commit(
    id: string,
    revision: number,
    status: 'draft' | 'active',
    confirmed: boolean,
    actor: AdminUserDto,
  ) {
    if (!confirmed)
      throw new BadRequestException({
        code: 'LISTING_CONFIRM_REQUIRED',
        message: '请先确认价格、参数与图片。',
      });
    const current = this.get(id, actor);
    if (current.productId) {
      if ((current.state === 'published') !== (status === 'active'))
        throw new ConflictException('This listing has already been saved; use the product editor');
      return current;
    }
    return this.mutate(
      id,
      revision,
      actor,
      async (s) => {
        const missing = missingFields(s, status === 'active');
        if (missing.length)
          throw new BadRequestException({
            code: 'LISTING_INCOMPLETE',
            message: '商品资料尚未完整。',
            missing,
          });
        if (this.products.bySlug(s.draft.slug) || this.committingSlugs.has(s.draft.slug))
          throw new ConflictException({
            code: 'LISTING_SLUG_EXISTS',
            message: '商品链接标识已存在，请修改。',
          });
        this.committingSlugs.add(s.draft.slug);
        try {
          const product = this.buildProduct(s, status);
          s.productId = product.id;
          s.state = status === 'active' ? 'published' : 'saved';
          s.messages.push({
            role: 'assistant',
            text:
              s.locale === 'zh-CN'
                ? status === 'active'
                  ? '商品已入库并上架。'
                  : '商品草稿已入库，尚未对外上架。'
                : status === 'active'
                  ? 'Product published.'
                  : 'Product saved as a draft.',
            at: new Date().toISOString(),
          });
          this.prepare(s);
          await this.snapshots.putBatchConfirmed([
            { kind: 'admin_product', entityId: product.id, refKey: product.slug, data: product },
            { kind: KIND, entityId: s.id, refKey: actor.id, data: s },
          ]);
          this.products.acceptPersisted(product);
          this.sessions.set(s.id, s);
          this.audit.append({
            actorUserId: actor.id,
            actorName: actor.fullName,
            entityType: 'Product',
            entityId: product.id,
            action: 'create',
            summary: `Listing ${s.id} saved as ${status}`,
            payload: { listingId: s.id, status },
          });
        } finally {
          this.committingSlugs.delete(s.draft.slug);
        }
      },
      true,
    );
  }

  private buildProduct(s: ProductListingSession, status: 'draft' | 'active'): AdminProductDto {
    const d = s.draft;
    const images = [
      s.mainImageId,
      ...s.selectedImageIds.filter((im) => im !== s.mainImageId),
    ].filter(Boolean);
    const product = buildProductDto({
      slug: d.slug,
      category: d.category as AdminProductDto['category'],
      status,
      name: { en: d.nameEn, 'zh-CN': d.nameZh || d.nameEn },
      description: { en: d.descriptionEn, 'zh-CN': d.descriptionZh || d.descriptionEn },
      supportedPrintMethods: d.printMethods,
      imageUrls: images.map((id) => s.images.find((im) => im.id === id)!.url),
      basePrice: { amountMinor: priceMinor(d.price)!, currency: d.currency },
      tags: [],
      productionLeadDays: d.productionLeadDays ?? 0,
      seoTitle: null,
      seoDescription: null,
    });
    for (const [ci, color] of (d.colors.length ? d.colors : ['Default']).entries()) {
      for (const [si, size] of (d.sizes.length ? d.sizes : ['One Size']).entries()) {
        product.variants.push({
          id: `var_${randomUUID()}`,
          productId: product.id,
          sku: `${d.slug.slice(0, 70)}-${product.id.slice(-8)}-${ci + 1}-${si + 1}`,
          attributes: { color, size, material: d.material },
          price: product.basePrice,
          weightGrams: null,
          isActive: true,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
        });
      }
    }
    if (
      d.printAreaConfirmed &&
      d.widthPx &&
      d.heightPx &&
      d.offsetXPx !== null &&
      d.offsetYPx !== null
    )
      product.printAreas.push({
        id: `area_${randomUUID()}`,
        productId: product.id,
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面' },
        widthPx: d.widthPx,
        heightPx: d.heightPx,
        mockupOffsetXPx: d.offsetXPx,
        mockupOffsetYPx: d.offsetYPx,
        allowedPrintMethods: d.printMethods,
      });
    return product;
  }

  private patchDraft(s: ProductListingSession, patch: Partial<ListingDraft>): void {
    const dto = plainToInstance(ListingPatchBody, patch);
    if (validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length)
      throw new BadRequestException('Invalid product fields');
    for (const [key, value] of Object.entries(patch)) {
      if (
        value === null &&
        !['productionLeadDays', 'widthPx', 'heightPx', 'offsetXPx', 'offsetYPx'].includes(key)
      )
        throw new BadRequestException('Invalid null field');
    }
    if (
      ['widthPx', 'heightPx', 'offsetXPx', 'offsetYPx', 'printMethods'].some(
        (key) => key in patch,
      ) &&
      !('printAreaConfirmed' in patch)
    )
      s.draft.printAreaConfirmed = false;
    Object.assign(s.draft, dto);
    s.draft.colors = [...new Set(s.draft.colors.map((v) => v.trim()).filter(Boolean))];
    s.draft.sizes = [...new Set(s.draft.sizes.map((v) => v.trim()).filter(Boolean))];
    if (!s.draft.slug && s.draft.nameEn)
      s.draft.slug =
        s.draft.nameEn
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 120) || `product-${s.id.slice(0, 8)}`;
  }

  private assertStorage(): void {
    if (process.env.NODE_ENV === 'production' && this.storage.name === 'in-memory')
      throw new ServiceUnavailableException({
        code: 'LISTING_STORAGE_UNAVAILABLE',
        message: '持久化图片存储未配置。',
      });
  }

  private storeImage(id: string, body: Buffer, contentType: string) {
    const ext =
      contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/webp' ? 'webp' : 'png';
    return this.storage.putObject({
      key: `product-listings/${id}/${randomUUID()}.${ext}`,
      body,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
  }

  private prepare(s: ProductListingSession): void {
    s.missing = missingFields(s);
    s.updatedAt = new Date().toISOString();
  }

  private async save(s: ProductListingSession): Promise<void> {
    this.prepare(s);
    await this.snapshots.putBatchConfirmed([
      { kind: KIND, entityId: s.id, refKey: s.ownerId, data: s },
    ]);
    this.sessions.set(s.id, s);
  }

  private async mutate(
    id: string,
    revision: number,
    actor: AdminUserDto,
    fn: (s: ProductListingSession) => Promise<void>,
    committed = false,
  ) {
    const s = this.get(id, actor);
    if (s.revision !== revision || this.busy.has(id))
      throw new ConflictException({ code: 'LISTING_STALE', message: '资料已更新，请刷新后重试。' });
    if (s.state !== 'collecting')
      throw new ConflictException('Listing already saved; use the product editor');
    this.busy.add(id);
    try {
      s.revision++;
      await fn(s);
      if (!committed) await this.save(s);
      return structuredClone(s);
    } finally {
      this.busy.delete(id);
    }
  }
}
