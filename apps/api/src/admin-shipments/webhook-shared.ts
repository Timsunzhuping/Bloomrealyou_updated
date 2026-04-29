import { Logger } from '@nestjs/common';

import type {
  AdminShipmentDto,
  ShipmentStatus,
  ShipmentTrackingUpdate,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';

interface ApplyArgs {
  source: 'easypost' | '17track' | 'shippo';
  trackingNumber: string;
  carrier?: string | null;
  update: ShipmentTrackingUpdate;
  shipments: AdminShipmentsRepository;
  orders: OrdersRepository;
  audit: AuditLogsRepository;
  log: Logger;
}

/**
 * Apply a normalised carrier update to the matching shipment record.
 * Identical post-processing for every webhook source so audit log shape and
 * order-status mirroring stays consistent.
 *
 * Returns the updated shipment id (or null if no match was found — webhooks
 * for unknown trackers are accepted and logged).
 */
export function applyTrackingUpdate(args: ApplyArgs): string | null {
  const shipment = findShipment(args.shipments, args.trackingNumber, args.carrier ?? undefined);
  if (!shipment) {
    args.log.warn(`No shipment for tracking ${args.trackingNumber}`);
    return null;
  }

  const previous = shipment.status;
  const patch: Partial<AdminShipmentDto> = { status: args.update.status };
  if (args.update.deliveredAt) patch.deliveredAt = args.update.deliveredAt;
  if (args.update.estimatedDeliveryAt) patch.estimatedDeliveryAt = args.update.estimatedDeliveryAt;
  if (
    !shipment.shippedAt &&
    (args.update.status === 'in_transit' ||
      args.update.status === 'out_for_delivery' ||
      args.update.status === 'delivered')
  ) {
    patch.shippedAt = args.update.occurredAt;
  }

  const updated = args.shipments.update(shipment.id, patch);
  if (!updated) return null;

  if (args.update.status === 'in_transit' || args.update.status === 'out_for_delivery') {
    args.orders.setStatus(updated.orderId, 'shipped');
  } else if (args.update.status === 'delivered') {
    args.orders.setStatus(updated.orderId, 'delivered');
  }

  if (previous !== args.update.status) {
    args.audit.append({
      actorUserId: null,
      actorName: `${args.source}-webhook`,
      entityType: 'Shipment',
      entityId: updated.id,
      action: 'status_change',
      payload: {
        source: `${args.source}-webhook`,
        from: previous,
        to: args.update.status,
        description: args.update.description,
      },
      summary: `${updated.shipmentNumber}: ${previous} → ${args.update.status} (${args.source} webhook)`,
    });
  }
  return updated.id;
}

function findShipment(
  repo: AdminShipmentsRepository,
  trackingNumber: string,
  carrier?: string,
): AdminShipmentDto | undefined {
  const result = repo.list({ q: trackingNumber, pageSize: 5 });
  const matches = result.items.filter((s) => s.trackingNumber === trackingNumber);
  if (matches.length === 0) return undefined;
  if (matches.length === 1) return matches[0];
  if (!carrier) return matches[0];
  return (
    matches.find((s) => (s.carrier ?? '').toLowerCase().includes(carrier.toLowerCase())) ??
    matches[0]
  );
}

export function mapEasyPostStatus(s: string | undefined): ShipmentStatus {
  switch (s) {
    case 'pre_transit':
    case 'unknown':
      return 'pending';
    case 'in_transit':
      return 'in_transit';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'return_to_sender':
      return 'returned';
    case 'failure':
    case 'error':
      return 'failed';
    default:
      return 'in_transit';
  }
}

export function mapSeventeentrackStatus(s: string | undefined): ShipmentStatus {
  switch ((s ?? '').toLowerCase()) {
    case 'notfound':
    case 'inforeceived':
    case 'pickup':
      return 'pending';
    case 'intransit':
      return 'in_transit';
    case 'outfordelivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    case 'undelivered':
    case 'exception':
      return 'failed';
    case 'expired':
      return 'returned';
    default:
      return 'in_transit';
  }
}

export function mapShippoStatus(s: string | undefined): ShipmentStatus {
  switch ((s ?? '').toUpperCase()) {
    case 'PRE_TRANSIT':
    case 'UNKNOWN':
      return 'pending';
    case 'TRANSIT':
      return 'in_transit';
    case 'DELIVERED':
      return 'delivered';
    case 'RETURNED':
      return 'returned';
    case 'FAILURE':
      return 'failed';
    default:
      return 'in_transit';
  }
}
