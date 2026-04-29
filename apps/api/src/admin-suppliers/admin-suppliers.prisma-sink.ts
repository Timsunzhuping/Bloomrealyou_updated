import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
} from '@custom-merch/shared';

import { runIfPrismaAvailable } from '../_lib/prisma-sink';

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
