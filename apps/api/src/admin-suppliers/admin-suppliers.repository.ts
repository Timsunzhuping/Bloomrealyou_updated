import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  ProductCategory,
  SupplierStatus,
} from '@custom-merch/shared';

interface ListFilter {
  q?: string;
  country?: string;
  status?: SupplierStatus;
  category?: ProductCategory;
  page?: number;
  pageSize?: number;
}

interface MappingListFilter {
  supplierId?: string;
  productId?: string;
  status?: AdminSupplierProductMappingDto['status'];
  page?: number;
  pageSize?: number;
}

/**
 * In-memory store for both suppliers and the supplier ↔ product mapping table.
 * Both collections live in the same repo because the recommendation engine
 * reads them together; splitting them into separate Nest providers buys
 * nothing for the in-memory MVP.
 */
@Injectable()
export class AdminSuppliersRepository {
  private readonly suppliers = new Map<string, AdminSupplierDto>();
  private readonly mappings = new Map<string, AdminSupplierProductMappingDto>();

  constructor() {
    this.seed();
  }

  // ── suppliers ────────────────────────────────────────────────────────

  listSuppliers(filter: ListFilter = {}): {
    items: AdminSupplierDto[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    let rows = Array.from(this.suppliers.values());
    if (filter.country) rows = rows.filter((s) => s.country === filter.country);
    if (filter.status) rows = rows.filter((s) => s.status === filter.status);
    if (filter.category) {
      rows = rows.filter((s) => s.supportedCategories.includes(filter.category as ProductCategory));
    }
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.contactEmail.toLowerCase().includes(q) ||
          s.contactName.toLowerCase().includes(q),
      );
    }
    rows = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  }

  getSupplier(id: string): AdminSupplierDto | undefined {
    return this.suppliers.get(id);
  }

  saveSupplier(supplier: AdminSupplierDto): AdminSupplierDto {
    this.suppliers.set(supplier.id, supplier);
    return supplier;
  }

  updateSupplier(id: string, patch: Partial<AdminSupplierDto>): AdminSupplierDto | undefined {
    const existing = this.suppliers.get(id);
    if (!existing) return undefined;
    const next: AdminSupplierDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.suppliers.set(id, next);
    return next;
  }

  deleteSupplier(id: string): boolean {
    // Cascade — remove mappings tied to the supplier.
    for (const [mid, m] of this.mappings.entries()) {
      if (m.supplierId === id) this.mappings.delete(mid);
    }
    return this.suppliers.delete(id);
  }

  /** All suppliers; consumed by the recommendation service. */
  allSuppliers(): AdminSupplierDto[] {
    return Array.from(this.suppliers.values());
  }

  // ── mappings ─────────────────────────────────────────────────────────

  listMappings(filter: MappingListFilter = {}): {
    items: AdminSupplierProductMappingDto[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 50, 1, 200);
    let rows = Array.from(this.mappings.values());
    if (filter.supplierId) rows = rows.filter((m) => m.supplierId === filter.supplierId);
    if (filter.productId) rows = rows.filter((m) => m.productId === filter.productId);
    if (filter.status) rows = rows.filter((m) => m.status === filter.status);
    rows = rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return {
      items: rows.slice((page - 1) * pageSize, page * pageSize),
      total: rows.length,
      page,
      pageSize,
    };
  }

  getMapping(id: string): AdminSupplierProductMappingDto | undefined {
    return this.mappings.get(id);
  }

  saveMapping(mapping: AdminSupplierProductMappingDto): AdminSupplierProductMappingDto {
    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  updateMapping(
    id: string,
    patch: Partial<AdminSupplierProductMappingDto>,
  ): AdminSupplierProductMappingDto | undefined {
    const existing = this.mappings.get(id);
    if (!existing) return undefined;
    const next: AdminSupplierProductMappingDto = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.mappings.set(id, next);
    return next;
  }

  /** Mappings whose product matches `productId`, optionally restricted to a
   *  specific variant. Used by the recommendation engine. */
  mappingsForProduct(
    productId: string,
    variantId?: string,
  ): AdminSupplierProductMappingDto[] {
    return Array.from(this.mappings.values()).filter((m) => {
      if (m.productId !== productId) return false;
      if (variantId && m.variantId && m.variantId !== variantId) return false;
      return true;
    });
  }

  // ── seed ─────────────────────────────────────────────────────────────

  private seed(): void {
    const now = '2026-04-26T00:00:00.000Z';
    const seeds: AdminSupplierDto[] = [
      {
        id: 'sup_dragon',
        name: 'Dragon Print Co.',
        country: 'CN',
        region: 'Guangdong',
        contactName: 'Lin Wei',
        contactEmail: 'lin@dragonprint.example',
        contactPhone: '+86 138 0000 0001',
        supportedCategories: ['t-shirts', 'hoodies', 'tote-bags'],
        supportedPrintMethods: ['screen_printing', 'dtg', 'embroidery'],
        minOrderQuantity: 50,
        averageProductionDays: 6,
        qualityScore: 88,
        onTimeRate: 0.95,
        returnRate: 0.012,
        supportsWhiteLabel: true,
        supportsSample: true,
        status: 'active',
        notes: 'Primary apparel partner.',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup_brightline',
        name: 'Brightline Studios',
        country: 'US',
        region: 'NY',
        contactName: 'Jamie Park',
        contactEmail: 'jamie@brightline.example',
        contactPhone: '+1 212-555-0100',
        supportedCategories: ['t-shirts', 'mugs', 'stickers'],
        supportedPrintMethods: ['dtg', 'sublimation', 'heat_transfer'],
        minOrderQuantity: 12,
        averageProductionDays: 4,
        qualityScore: 92,
        onTimeRate: 0.97,
        returnRate: 0.008,
        supportsWhiteLabel: true,
        supportsSample: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup_madrid',
        name: 'Madrid Mockup',
        country: 'ES',
        region: 'Madrid',
        contactName: 'Carla Núñez',
        contactEmail: 'carla@madridmockup.example',
        supportedCategories: ['hoodies', 'hats', 'tote-bags'],
        supportedPrintMethods: ['embroidery', 'screen_printing'],
        minOrderQuantity: 100,
        averageProductionDays: 7,
        qualityScore: 84,
        onTimeRate: 0.91,
        returnRate: 0.015,
        supportsWhiteLabel: false,
        supportsSample: true,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'sup_dubai',
        name: 'Dubai Drop',
        country: 'AE',
        region: 'Dubai',
        contactName: 'Rashed Al-Maktoum',
        contactEmail: 'rashed@dubaidrop.example',
        supportedCategories: ['mugs', 'stickers', 'tote-bags'],
        supportedPrintMethods: ['sublimation', 'heat_transfer'],
        minOrderQuantity: 24,
        averageProductionDays: 5,
        qualityScore: 86,
        onTimeRate: 0.93,
        returnRate: 0.011,
        supportsWhiteLabel: true,
        supportsSample: false,
        status: 'onboarding',
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const s of seeds) this.suppliers.set(s.id, s);

    const mappingSeeds: AdminSupplierProductMappingDto[] = [
      {
        id: `map_${randomUUID().slice(0, 8)}`,
        supplierId: 'sup_dragon',
        productId: 'prod_classic-cotton-tee',
        variantId: null,
        supplierSku: 'DRGN-COT-TEE',
        costPrice: { amountMinor: 690, currency: 'USD' },
        productionDays: 5,
        minOrderQuantity: 50,
        maxDailyCapacity: 800,
        printMethods: ['screen_printing', 'dtg'],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `map_${randomUUID().slice(0, 8)}`,
        supplierId: 'sup_brightline',
        productId: 'prod_classic-cotton-tee',
        variantId: null,
        supplierSku: 'BL-COT-TEE',
        costPrice: { amountMinor: 880, currency: 'USD' },
        productionDays: 3,
        minOrderQuantity: 12,
        maxDailyCapacity: 200,
        printMethods: ['dtg'],
        status: 'active',
        createdAt: now,
        updatedAt: now,
      },
    ];
    for (const m of mappingSeeds) this.mappings.set(m.id, m);
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
