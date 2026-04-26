import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  MOCK_PRODUCTS,
  findMockProductById,
  type AdminProductDto,
  type AdminProductPriceTierDto,
  type AdminProductPrintAreaDto,
  type AdminProductVariantDto,
  type LocalisedString,
  type ProductCategory,
  type ProductStatus,
} from '@custom-merch/shared';

interface ListFilter {
  q?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  page?: number;
  pageSize?: number;
}

/**
 * Writable in-memory product store, seeded from the mock catalogue. Drop-in
 * for the future Prisma table. Keeps variants, print areas and price tiers
 * inside a single `AdminProductDto` so the admin UI can render and edit
 * everything from a single payload.
 */
@Injectable()
export class AdminProductsRepository {
  private readonly products = new Map<string, AdminProductDto>();

  constructor() {
    this.seed();
  }

  private seed(): void {
    for (const product of MOCK_PRODUCTS) {
      const bundle = findMockProductById(product.id as unknown as string);
      if (!bundle) continue;
      const dto: AdminProductDto = {
        id: bundle.product.id as unknown as string,
        slug: bundle.product.slug,
        category: bundle.product.category,
        status: bundle.product.status,
        name: bundle.product.name,
        description: bundle.product.description,
        supportedPrintMethods: [...bundle.product.supportedPrintMethods],
        imageUrls: [...bundle.product.imageUrls],
        basePrice: bundle.product.basePrice,
        tags: [...bundle.product.tags],
        productionLeadDays: bundle.product.productionLeadDays,
        seoTitle: null,
        seoDescription: null,
        variants: bundle.variants.map((v) => ({
          id: v.id as unknown as string,
          productId: v.productId as unknown as string,
          sku: v.sku,
          attributes: { ...v.attributes },
          price: v.price,
          weightGrams: v.weightGrams ?? null,
          isActive: v.isActive,
          createdAt: v.createdAt,
          updatedAt: v.updatedAt,
        })),
        printAreas: bundle.printAreas.map((a) => ({
          id: a.id as unknown as string,
          productId: a.productId as unknown as string,
          key: a.key,
          label: a.label,
          widthPx: a.widthPx,
          heightPx: a.heightPx,
          mockupOffsetXPx: a.mockupOffsetXPx,
          mockupOffsetYPx: a.mockupOffsetYPx,
          allowedPrintMethods: [...a.allowedPrintMethods],
        })),
        priceTiers: bundle.priceTiers.map((t) => ({
          id: t.id as unknown as string,
          productId: t.productId as unknown as string,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          unitPrice: t.unitPrice,
          currency: t.currency,
          printMethod: t.printMethod,
        })),
        createdAt: bundle.product.createdAt,
        updatedAt: bundle.product.updatedAt,
      };
      this.products.set(dto.id, dto);
    }
  }

  list(filter: ListFilter = {}): { items: AdminProductDto[]; total: number; page: number; pageSize: number } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    const q = filter.q?.trim().toLowerCase() ?? '';
    let rows = Array.from(this.products.values());
    if (filter.category) rows = rows.filter((p) => p.category === filter.category);
    if (filter.status) rows = rows.filter((p) => p.status === filter.status);
    if (q.length > 0) {
      rows = rows.filter((p) =>
        p.slug.toLowerCase().includes(q) ||
        Object.values(p.name).some((n) => (n ?? '').toLowerCase().includes(q)) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }
    rows = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const total = rows.length;
    const items = rows.slice((page - 1) * pageSize, page * pageSize);
    return { items, total, page, pageSize };
  }

  get(id: string): AdminProductDto | undefined {
    return this.products.get(id);
  }

  bySlug(slug: string): AdminProductDto | undefined {
    for (const p of this.products.values()) if (p.slug === slug) return p;
    return undefined;
  }

  create(dto: AdminProductDto): AdminProductDto {
    this.products.set(dto.id, dto);
    return dto;
  }

  update(id: string, patch: Partial<AdminProductDto>): AdminProductDto | undefined {
    const existing = this.products.get(id);
    if (!existing) return undefined;
    const next: AdminProductDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.products.set(id, next);
    return next;
  }

  delete(id: string): boolean {
    return this.products.delete(id);
  }

  // ── nested resources (variants / print areas / price tiers) ────────────
  upsertVariant(productId: string, variant: AdminProductVariantDto): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    const idx = product.variants.findIndex((v) => v.id === variant.id);
    const variants = [...product.variants];
    if (idx >= 0) variants[idx] = variant;
    else variants.push(variant);
    return this.update(productId, { variants });
  }

  removeVariant(productId: string, variantId: string): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    return this.update(productId, {
      variants: product.variants.filter((v) => v.id !== variantId),
    });
  }

  upsertPrintArea(productId: string, area: AdminProductPrintAreaDto): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    const idx = product.printAreas.findIndex((a) => a.id === area.id);
    const printAreas = [...product.printAreas];
    if (idx >= 0) printAreas[idx] = area;
    else printAreas.push(area);
    return this.update(productId, { printAreas });
  }

  removePrintArea(productId: string, printAreaId: string): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    return this.update(productId, {
      printAreas: product.printAreas.filter((a) => a.id !== printAreaId),
    });
  }

  upsertPriceTier(productId: string, tier: AdminProductPriceTierDto): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    const idx = product.priceTiers.findIndex((t) => t.id === tier.id);
    const priceTiers = [...product.priceTiers];
    if (idx >= 0) priceTiers[idx] = tier;
    else priceTiers.push(tier);
    priceTiers.sort((a, b) => a.minQuantity - b.minQuantity);
    return this.update(productId, { priceTiers });
  }

  removePriceTier(productId: string, tierId: string): AdminProductDto | undefined {
    const product = this.products.get(productId);
    if (!product) return undefined;
    return this.update(productId, {
      priceTiers: product.priceTiers.filter((t) => t.id !== tierId),
    });
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Build a fresh DTO for product creation. Keeps the controller focused on validation. */
export function buildProductDto(args: {
  slug: string;
  category: ProductCategory;
  status: ProductStatus;
  name: LocalisedString;
  description: LocalisedString;
  supportedPrintMethods: AdminProductDto['supportedPrintMethods'];
  imageUrls: string[];
  basePrice: AdminProductDto['basePrice'];
  tags: string[];
  productionLeadDays: number;
  seoTitle: LocalisedString | null;
  seoDescription: LocalisedString | null;
}): AdminProductDto {
  const id = `prod_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  return {
    id,
    slug: args.slug,
    category: args.category,
    status: args.status,
    name: args.name,
    description: args.description,
    supportedPrintMethods: args.supportedPrintMethods,
    imageUrls: args.imageUrls,
    basePrice: args.basePrice,
    tags: args.tags,
    productionLeadDays: args.productionLeadDays,
    seoTitle: args.seoTitle,
    seoDescription: args.seoDescription,
    variants: [],
    printAreas: [],
    priceTiers: [],
    createdAt: now,
    updatedAt: now,
  };
}
