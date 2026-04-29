import type { AdminShipmentDto } from '@custom-merch/shared';

import { runIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Dual-write Shipment records to Prisma. The schema's column set is a near-
 * exact match for the runtime DTO, so this sink mostly just serialises money
 * back to (currency, amountMinor) and date strings to JS Date objects.
 *
 * `productionJobIds` join through `ShipmentProductionJob`; we don't manage
 * that table here — a follow-up WP can keep it in sync via `connect`/
 * `disconnect` once the entity primary keys are migrated to UUIDs.
 */
export function tryPersistShipment(entity: AdminShipmentDto): void {
  runIfPrismaAvailable('shipment', (client) =>
    client.shipment.upsert({
      where: { id: entity.id },
      create: {
        id: entity.id,
        orderId: entity.orderId,
        carrier: entity.carrier ?? '',
        serviceLevel: entity.shippingMethod ?? undefined,
        trackingNumber: entity.trackingNumber ?? undefined,
        trackingUrl: entity.trackingUrl ?? undefined,
        status: entity.status,
        currency: entity.shippingCost?.currency ?? 'USD',
        shippingCostAmountMinor: entity.shippingCost?.amountMinor,
        packageWeightGrams: entity.packageWeightGrams ?? undefined,
        shippedAt: entity.shippedAt ? new Date(entity.shippedAt) : undefined,
        estimatedDeliveryAt: entity.estimatedDeliveryAt
          ? new Date(entity.estimatedDeliveryAt)
          : undefined,
        deliveredAt: entity.deliveredAt ? new Date(entity.deliveredAt) : undefined,
        metadata: { shipmentNumber: entity.shipmentNumber, productionJobIds: entity.productionJobIds, notes: entity.notes },
      },
      update: {
        carrier: entity.carrier ?? '',
        serviceLevel: entity.shippingMethod ?? undefined,
        trackingNumber: entity.trackingNumber ?? undefined,
        trackingUrl: entity.trackingUrl ?? undefined,
        status: entity.status,
        currency: entity.shippingCost?.currency ?? 'USD',
        shippingCostAmountMinor: entity.shippingCost?.amountMinor,
        packageWeightGrams: entity.packageWeightGrams ?? undefined,
        shippedAt: entity.shippedAt ? new Date(entity.shippedAt) : undefined,
        estimatedDeliveryAt: entity.estimatedDeliveryAt
          ? new Date(entity.estimatedDeliveryAt)
          : undefined,
        deliveredAt: entity.deliveredAt ? new Date(entity.deliveredAt) : undefined,
        metadata: { shipmentNumber: entity.shipmentNumber, productionJobIds: entity.productionJobIds, notes: entity.notes },
      },
    }),
  );
}
