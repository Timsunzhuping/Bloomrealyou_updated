import type { AdminProductionJobDto, ProductionJobStatus } from '@custom-merch/shared';

import { runIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Dual-write production jobs to Prisma when `DATABASE_URL` is set.
 *
 * Caveats (all silenced):
 *   - The schema enum currently encodes the WP-02 vocabulary
 *     (`queued|assigned|in_progress|quality_check|completed|failed`); the
 *     runtime DTO uses the WP-15 vocabulary. We translate via
 *     {@link toLegacyStatus} so writes don't fail before the next migration.
 *   - The schema's `ProductionJobStatus` doesn't have a 1:1 mapping to every
 *     new state — we collapse the variants we cannot represent into the
 *     closest legacy value and round-trip the original under `metadata.status`.
 *   - `qcAttachments` and `internalNotes` aren't first-class columns; both
 *     ride along under `metadata`.
 */
export function tryPersistProductionJob(entity: AdminProductionJobDto): void {
  runIfPrismaAvailable('productionJob', (client) =>
    client.productionJob.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        jobNumber: entity.jobNumber,
        orderId: entity.orderId,
        supplierId: entity.supplierId ?? undefined,
        printMethod: entity.printMethod,
        status: toLegacyStatus(entity.status),
        quantity: entity.quantity,
        currency: entity.supplierCost?.currency ?? 'USD',
        supplierCostAmountMinor: entity.supplierCost?.amountMinor,
        expectedReadyAt: entity.expectedReadyAt ? new Date(entity.expectedReadyAt) : undefined,
        startedAt: entity.startedAt ? new Date(entity.startedAt) : undefined,
        completedAt: entity.completedAt ? new Date(entity.completedAt) : undefined,
        qcNotes: entity.qcNotes ?? undefined,
        failureReason: entity.failureReason ?? undefined,
        metadata: extraJobFields(entity),
      },
      update: {
        supplierId: entity.supplierId ?? undefined,
        status: toLegacyStatus(entity.status),
        currency: entity.supplierCost?.currency ?? 'USD',
        supplierCostAmountMinor: entity.supplierCost?.amountMinor,
        expectedReadyAt: entity.expectedReadyAt ? new Date(entity.expectedReadyAt) : undefined,
        startedAt: entity.startedAt ? new Date(entity.startedAt) : undefined,
        completedAt: entity.completedAt ? new Date(entity.completedAt) : undefined,
        qcNotes: entity.qcNotes ?? undefined,
        failureReason: entity.failureReason ?? undefined,
        metadata: extraJobFields(entity),
      },
    }),
  );
}

function toLegacyStatus(status: ProductionJobStatus): string {
  switch (status) {
    case 'created':
      return 'queued';
    case 'assigned':
    case 'supplier_confirmed':
      return 'assigned';
    case 'in_production':
      return 'in_progress';
    case 'qc_pending':
    case 'qc_passed':
      return 'quality_check';
    case 'qc_failed':
    case 'cancelled':
      return 'failed';
    case 'ready_to_ship':
    case 'shipped':
      return 'completed';
    default:
      return 'queued';
  }
}

function extraJobFields(entity: AdminProductionJobDto): Record<string, unknown> {
  return {
    runtimeStatus: entity.status,
    orderItemIds: entity.orderItemIds,
    qcAttachments: entity.qcAttachments,
    internalNotes: entity.internalNotes,
    supplierName: entity.supplierName,
  };
}
