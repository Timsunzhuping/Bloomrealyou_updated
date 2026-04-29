import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  ProductCategory,
  PrintMethod,
  SupplierStatus,
} from '@custom-merch/shared';

import { readIfPrismaAvailable, runIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Dual-write Supplier records to Prisma when `DATABASE_URL` is set.
 *
 * Failure modes (all silenced — see `runIfPrismaAvailable`):
 *   - In-memory IDs use `sup_*` prefixes; Prisma `id` is `@db.Uuid`. The sink
 *     succeeds only after IDs are migrated to UUIDs (a separate WP).
 *   - The schema's Supplier model carries fewer columns than the admin DTO
 *     (no `region`, `onTimeRate`, `returnRate`, `supportsWhiteLabel`,
 *     `supportsSample`, `minOrderQuantity`, `averageProductionDays`); we stash
 *     the extras under `metadata` so no information is lost, and a future
 *     schema update can promote them to first-class columns.
 */
export function tryPersistSupplier(entity: AdminSupplierDto): void {
  runIfPrismaAvailable('supplier', (client) =>
    client.supplier.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        name: entity.name,
        contactEmail: entity.contactEmail,
        contactPhone: entity.contactPhone ?? undefined,
        status: entity.status,
        capabilities: entity.supportedPrintMethods,
        countryCode: entity.country,
        avgLeadDays: entity.averageProductionDays,
        qualityScore: entity.qualityScore,
        notes: entity.notes ?? undefined,
        metadata: extraSupplierFields(entity),
      },
      update: {
        name: entity.name,
        contactEmail: entity.contactEmail,
        contactPhone: entity.contactPhone ?? undefined,
        status: entity.status,
        capabilities: entity.supportedPrintMethods,
        countryCode: entity.country,
        avgLeadDays: entity.averageProductionDays,
        qualityScore: entity.qualityScore,
        notes: entity.notes ?? undefined,
        metadata: extraSupplierFields(entity),
      },
    }),
  );
}

export function tryDeleteSupplier(id: string): void {
  runIfPrismaAvailable('supplier:delete', (client) =>
    client.supplier.delete({ where: { id } }),
  );
}

export function tryPersistMapping(entity: AdminSupplierProductMappingDto): void {
  runIfPrismaAvailable('supplierProductMapping', (client) =>
    client.supplierProductMapping.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        supplierId: entity.supplierId,
        productId: entity.productId,
        variantId: entity.variantId ?? undefined,
        printMethod: entity.printMethods[0] ?? 'dtg',
        currency: entity.costPrice.currency,
        unitCostAmountMinor: entity.costPrice.amountMinor,
        minOrderQuantity: entity.minOrderQuantity,
        dailyCapacity: entity.maxDailyCapacity,
        leadDays: entity.productionDays,
        isActive: entity.status === 'active',
      },
      update: {
        currency: entity.costPrice.currency,
        unitCostAmountMinor: entity.costPrice.amountMinor,
        minOrderQuantity: entity.minOrderQuantity,
        dailyCapacity: entity.maxDailyCapacity,
        leadDays: entity.productionDays,
        isActive: entity.status === 'active',
      },
    }),
  );
}

/**
 * Prime a fresh in-memory cache from Prisma at boot.
 *
 * Returns `null` when Prisma is unavailable (so the caller can keep its
 * seeded demo rows). Returns `[]` when Prisma is wired up but empty —
 * the caller should treat that as a real, intentional empty store.
 */
export async function primeSuppliersFromPrisma(): Promise<AdminSupplierDto[] | null> {
  return readIfPrismaAvailable('supplier:prime', async (client) => {
    const rows = (await client.supplier.findMany()) as PrismaSupplierRow[];
    return rows.map(rowToSupplier);
  });
}

export async function primeMappingsFromPrisma(): Promise<
  AdminSupplierProductMappingDto[] | null
> {
  return readIfPrismaAvailable('supplierProductMapping:prime', async (client) => {
    const rows = (await client.supplierProductMapping.findMany()) as PrismaMappingRow[];
    return rows.map(rowToMapping);
  });
}

interface PrismaSupplierRow {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone: string | null;
  status: string;
  capabilities: string[];
  countryCode: string;
  avgLeadDays: number | null;
  qualityScore: number | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PrismaMappingRow {
  id: string;
  supplierId: string;
  productId: string;
  variantId: string | null;
  printMethod: string;
  currency: string;
  unitCostAmountMinor: number;
  minOrderQuantity: number;
  dailyCapacity: number | null;
  leadDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function rowToSupplier(row: PrismaSupplierRow): AdminSupplierDto {
  const meta = (row.metadata ?? {}) as {
    region?: string | null;
    contactName?: string;
    minOrderQuantity?: number;
    onTimeRate?: number;
    returnRate?: number;
    supportsWhiteLabel?: boolean;
    supportsSample?: boolean;
    supportedCategories?: ProductCategory[];
    extraPrintMethods?: PrintMethod[];
  };
  return {
    id: row.id,
    name: row.name,
    country: row.countryCode,
    region: meta.region ?? null,
    contactName: meta.contactName ?? '',
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    supportedCategories: meta.supportedCategories ?? [],
    supportedPrintMethods:
      meta.extraPrintMethods ?? (row.capabilities as PrintMethod[]),
    minOrderQuantity: meta.minOrderQuantity ?? 1,
    averageProductionDays: row.avgLeadDays ?? 7,
    qualityScore: row.qualityScore ?? 80,
    onTimeRate: meta.onTimeRate ?? 0.9,
    returnRate: meta.returnRate ?? 0.02,
    supportsWhiteLabel: meta.supportsWhiteLabel ?? false,
    supportsSample: meta.supportsSample ?? false,
    status: row.status as SupplierStatus,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function rowToMapping(row: PrismaMappingRow): AdminSupplierProductMappingDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    productId: row.productId,
    variantId: row.variantId,
    supplierSku: '',
    costPrice: {
      amountMinor: row.unitCostAmountMinor,
      currency: row.currency as 'USD',
    },
    productionDays: row.leadDays,
    minOrderQuantity: row.minOrderQuantity,
    maxDailyCapacity: row.dailyCapacity ?? 0,
    printMethods: [row.printMethod as PrintMethod],
    status: row.isActive ? 'active' : 'paused',
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function extraSupplierFields(entity: AdminSupplierDto): Record<string, unknown> {
  return {
    region: entity.region,
    contactName: entity.contactName,
    minOrderQuantity: entity.minOrderQuantity,
    onTimeRate: entity.onTimeRate,
    returnRate: entity.returnRate,
    supportsWhiteLabel: entity.supportsWhiteLabel,
    supportsSample: entity.supportsSample,
    supportedCategories: entity.supportedCategories,
    /** All `printMethods` (the schema has a single per-mapping `printMethod`). */
    extraPrintMethods: entity.supportedPrintMethods,
  };
}
