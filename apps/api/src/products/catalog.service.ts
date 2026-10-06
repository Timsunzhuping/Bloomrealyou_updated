import { Injectable, NotFoundException } from '@nestjs/common';

import { AdminProductsRepository } from '../admin-products/admin-products.repository';

import type {
  AdminProductDto,
  Product,
  ProductPriceTier,
  ProductPrintArea,
  ProductVariant,
} from '@custom-merch/shared';

@Injectable()
export class CatalogService {
  constructor(private readonly repo: AdminProductsRepository) {}
  list(category?: string, page = 1, pageSize = 24) {
    const rows = this.repo.list({
      category: category as AdminProductDto['category'],
      status: 'active',
      page,
      pageSize,
    });
    return { ...rows, items: rows.items.map((p) => this.bundle(p).product) };
  }
  find(idOrSlug: string) {
    const p = this.repo.get(idOrSlug) ?? this.repo.bySlug(idOrSlug);
    return p?.status === 'active' ? this.bundle(p) : undefined;
  }
  get(idOrSlug: string) {
    const bundle = this.find(idOrSlug);
    if (!bundle) throw new NotFoundException(`Product not found: ${idOrSlug}`);
    return bundle;
  }
  private bundle(p: AdminProductDto): {
    product: Product;
    variants: ProductVariant[];
    printAreas: ProductPrintArea[];
    priceTiers: ProductPriceTier[];
  } {
    return {
      product: {
        id: p.id as Product['id'],
        slug: p.slug,
        category: p.category,
        status: p.status,
        name: p.name,
        description: p.description,
        supportedPrintMethods: p.supportedPrintMethods,
        imageUrls: p.imageUrls,
        basePrice: p.basePrice,
        tags: p.tags,
        productionLeadDays: p.productionLeadDays,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      },
      variants: p.variants
        .filter((v) => v.isActive)
        .map((v) => ({
          ...v,
          id: v.id as ProductVariant['id'],
          productId: v.productId as ProductVariant['productId'],
          weightGrams: v.weightGrams ?? undefined,
        })),
      printAreas: p.printAreas.map((a) => ({
        ...a,
        id: a.id as ProductPrintArea['id'],
        productId: a.productId as ProductPrintArea['productId'],
      })),
      priceTiers: p.priceTiers.map((t) => ({
        ...t,
        id: t.id as ProductPriceTier['id'],
        productId: t.productId as ProductPriceTier['productId'],
      })),
    };
  }
}
