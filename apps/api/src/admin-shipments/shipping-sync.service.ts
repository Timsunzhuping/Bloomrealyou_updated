import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import type {
  AdminShipmentDto,
  AdminUserDto,
  ShippingProvider,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';
import { SHIPPING_PROVIDER } from './shipping.tokens';

@Injectable()
export class ShippingSyncService {
  private readonly log = new Logger(ShippingSyncService.name);

  constructor(
    private readonly repo: AdminShipmentsRepository,
    private readonly orders: OrdersRepository,
    private readonly audit: AuditLogsRepository,
    @Inject(SHIPPING_PROVIDER) private readonly provider: ShippingProvider,
  ) {}

  /** Force a poll for one shipment. Returns the (possibly unchanged) record. */
  async syncOne(id: string, actor: AdminUserDto): Promise<AdminShipmentDto> {
    const shipment = this.repo.get(id);
    if (!shipment) throw new NotFoundException(`Shipment not found: ${id}`);
    if (!shipment.trackingNumber) return shipment;

    const update = await this.provider.fetchTrackingUpdate({
      carrier: shipment.carrier,
      trackingNumber: shipment.trackingNumber,
      shippedAt: shipment.shippedAt,
    });

    if (!update) {
      this.log.log(`No update from ${this.provider.name} for ${shipment.shipmentNumber}`);
      return shipment;
    }

    const previous = shipment.status;
    const patch: Partial<AdminShipmentDto> = { status: update.status };
    if (update.deliveredAt) patch.deliveredAt = update.deliveredAt;
    if (update.estimatedDeliveryAt) patch.estimatedDeliveryAt = update.estimatedDeliveryAt;
    if (!shipment.shippedAt && (update.status === 'in_transit' || update.status === 'out_for_delivery' || update.status === 'delivered')) {
      patch.shippedAt = update.occurredAt;
    }

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Shipment vanished mid-sync: ${id}`);

    if (update.status === 'in_transit' || update.status === 'out_for_delivery') {
      this.orders.setStatus(updated.orderId, 'shipped');
    } else if (update.status === 'delivered') {
      this.orders.setStatus(updated.orderId, 'delivered');
    }

    if (previous !== update.status) {
      this.audit.append({
        actorUserId: actor.id,
        actorName: actor.fullName,
        entityType: 'Shipment',
        entityId: id,
        action: 'status_change',
        payload: {
          from: previous,
          to: update.status,
          source: this.provider.name,
          description: update.description,
        },
        summary: `${shipment.shipmentNumber}: ${previous} → ${update.status} (via ${this.provider.name})`,
      });
    }
    return updated;
  }

  /** Provider name for the admin UI to display ("Synced via EasyPost"). */
  providerName(): string {
    return this.provider.name;
  }
}
