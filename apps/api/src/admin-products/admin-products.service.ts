import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AdminProductDto,
  AdminProductPriceTierDto,
  AdminProductPrintAreaDto,
  AdminProductVariantDto,
  AdminUserDto,
  Currency,
  StorageProvider,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { AdminProductsRepository, buildProductDto } from './admin-products.repository';
import {
  CreateProductBody,
  UpdateProductBody,
  UpsertPriceTierBody,
  UpsertPrintAreaBody,
  UpsertVariantBody,
} from './admin-products.dto';

const SUPPORTED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

@Injectable()
export class AdminProductsService {
  constructor(
    private readonly repo: AdminProductsRepository,
    private readonly audit: AuditLogsRepository,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
  ) {}

  list(filter: { q?: string; category?: string; status?: string; page?: number; pageSize?: number }) {
    return this.repo.list({
      q: filter.q,
      category: filter.category as AdminProductDto['category'] | undefined,
      status: filter.status as AdminProductDto['status'] | undefined,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): AdminProductDto {
    const product = this.repo.get(id);
    if (!product) throw new NotFoundException(`Product not found: ${id}`);
    return product;
  }

  async create(input: CreateProductBody, actor: AdminUserDto): Promise<AdminProductDto> {
    if (this.repo.bySlug(input.slug)) {
      throw new BadRequestException(`Slug already in use: ${input.slug}`);
    }
    const currency = (input.currency ?? 'USD') as Currency;
    const uploaded = await this.uploadImages(input.imageDataUrls ?? []);
    const imageUrls = [...(input.imageUrls ?? []), ...uploaded];
    const dto = buildProductDto({
      slug: input.slug,
      category: input.category,
      status: input.status ?? 'draft',
      name: input.name,
      description: input.description,
      supportedPrintMethods: input.supportedPrintMethods,
      imageUrls,
      basePrice: { amountMinor: input.basePriceMinor, currency },
      tags: input.tags ?? [],
      productionLeadDays: input.productionLeadDays ?? 5,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
    });
    this.repo.create(dto);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Product',
      entityId: dto.id,
      action: 'create',
      summary: `created product ${dto.slug}`,
    });
    return dto;
  }

  async update(id: string, input: UpdateProductBody, actor: AdminUserDto): Promise<AdminProductDto> {
    const existing = this.get(id);
    if (input.slug && input.slug !== existing.slug && this.repo.bySlug(input.slug)) {
      throw new BadRequestException(`Slug already in use: ${input.slug}`);
    }
    const uploaded = await this.uploadImages(input.imageDataUrls ?? []);
    const patch: Partial<AdminProductDto> = {};
    if (input.slug !== undefined) patch.slug = input.slug;
    if (input.category !== undefined) patch.category = input.category;
    if (input.status !== undefined) patch.status = input.status;
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;
    if (input.supportedPrintMethods !== undefined) patch.supportedPrintMethods = input.supportedPrintMethods;
    if (input.imageUrls !== undefined || uploaded.length > 0) {
      patch.imageUrls = [...(input.imageUrls ?? existing.imageUrls), ...uploaded];
    }
    if (input.basePriceMinor !== undefined) {
      patch.basePrice = {
        amountMinor: input.basePriceMinor,
        currency: (input.currency ?? existing.basePrice.currency) as Currency,
      };
    }
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.productionLeadDays !== undefined) patch.productionLeadDays = input.productionLeadDays;
    if (input.seoTitle !== undefined) patch.seoTitle = input.seoTitle;
    if (input.seoDescription !== undefined) patch.seoDescription = input.seoDescription;

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Product not found: ${id}`);
    const action = patch.status && patch.status !== existing.status ? 'status_change' : 'update';
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Product',
      entityId: id,
      action,
      payload: { keys: Object.keys(patch) },
      summary: `updated product ${updated.slug}`,
    });
    return updated;
  }

  delete(id: string, actor: AdminUserDto): void {
    const existing = this.get(id);
    this.repo.delete(id);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Product',
      entityId: id,
      action: 'delete',
      summary: `deleted product ${existing.slug}`,
    });
  }

  upsertVariant(input: UpsertVariantBody, actor: AdminUserDto): AdminProductDto {
    const product = this.get(input.productId);
    const currency = (input.currency ?? product.basePrice.currency) as Currency;
    const variant: AdminProductVariantDto = {
      id: input.id ?? `var_${randomUUID().slice(0, 8)}`,
      productId: product.id,
      sku: input.sku,
      attributes: input.attributes,
      price: { amountMinor: input.unitPriceMinor, currency },
      weightGrams: input.weightGrams ?? null,
      isActive: input.isActive ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = this.repo.upsertVariant(product.id, variant);
    if (!updated) throw new NotFoundException(`Product not found: ${product.id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductVariant',
      entityId: variant.id,
      action: input.id ? 'update' : 'create',
      payload: { sku: variant.sku, productId: product.id },
    });
    return updated;
  }

  removeVariant(productId: string, variantId: string, actor: AdminUserDto): AdminProductDto {
    const updated = this.repo.removeVariant(productId, variantId);
    if (!updated) throw new NotFoundException(`Product not found: ${productId}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductVariant',
      entityId: variantId,
      action: 'delete',
    });
    return updated;
  }

  upsertPrintArea(input: UpsertPrintAreaBody, actor: AdminUserDto): AdminProductDto {
    const product = this.get(input.productId);
    const area: AdminProductPrintAreaDto = {
      id: input.id ?? `area_${randomUUID().slice(0, 8)}`,
      productId: product.id,
      key: input.key,
      label: input.label,
      widthPx: input.widthPx,
      heightPx: input.heightPx,
      mockupOffsetXPx: input.mockupOffsetXPx,
      mockupOffsetYPx: input.mockupOffsetYPx,
      allowedPrintMethods: input.allowedPrintMethods,
    };
    const updated = this.repo.upsertPrintArea(product.id, area);
    if (!updated) throw new NotFoundException(`Product not found: ${product.id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductPrintArea',
      entityId: area.id,
      action: input.id ? 'update' : 'create',
      payload: { key: area.key, productId: product.id },
    });
    return updated;
  }

  removePrintArea(productId: string, printAreaId: string, actor: AdminUserDto): AdminProductDto {
    const updated = this.repo.removePrintArea(productId, printAreaId);
    if (!updated) throw new NotFoundException(`Product not found: ${productId}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductPrintArea',
      entityId: printAreaId,
      action: 'delete',
    });
    return updated;
  }

  upsertPriceTier(input: UpsertPriceTierBody, actor: AdminUserDto): AdminProductDto {
    const product = this.get(input.productId);
    const currency = (input.currency ?? product.basePrice.currency) as Currency;
    const tier: AdminProductPriceTierDto = {
      id: input.id ?? `tier_${randomUUID().slice(0, 8)}`,
      productId: product.id,
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity ?? null,
      unitPrice: { amountMinor: input.unitPriceMinor, currency },
      currency: input.currency,
      printMethod: input.printMethod,
    };
    const updated = this.repo.upsertPriceTier(product.id, tier);
    if (!updated) throw new NotFoundException(`Product not found: ${product.id}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductPriceTier',
      entityId: tier.id,
      action: input.id ? 'update' : 'create',
      payload: { minQuantity: tier.minQuantity, productId: product.id },
    });
    return updated;
  }

  removePriceTier(productId: string, tierId: string, actor: AdminUserDto): AdminProductDto {
    const updated = this.repo.removePriceTier(productId, tierId);
    if (!updated) throw new NotFoundException(`Product not found: ${productId}`);
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'ProductPriceTier',
      entityId: tierId,
      action: 'delete',
    });
    return updated;
  }

  private async uploadImages(dataUrls: string[]): Promise<string[]> {
    const out: string[] = [];
    for (const dataUrl of dataUrls) {
      const parts = parseDataUrl(dataUrl);
      if (!parts || !SUPPORTED_IMAGE_MIMES.has(parts.mime)) continue;
      const ext = parts.mime.split('/')[1]!.replace('+xml', '');
      const result = await this.storage.putObject({
        key: `products/${randomUUID()}.${ext}`,
        body: parts.buffer,
        contentType: parts.mime,
        cacheControl: 'public, max-age=86400',
      });
      out.push(result.url);
    }
    return out;
  }
}

interface DataUrlParts {
  mime: string;
  buffer: Buffer;
}
function parseDataUrl(dataUrl: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1]!, buffer: Buffer.from(match[2]!, 'base64') };
}
