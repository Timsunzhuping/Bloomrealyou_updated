import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';

import type {
  AdminShipmentDto,
  AdminUserDto,
  Currency,
  OrderTrackingDto,
  PublicShipmentDto,
  ShipmentStatus,
} from '@custom-merch/shared';

import { AdminProductionRepository } from '../admin-production/admin-production.repository';
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminShipmentsRepository } from './admin-shipments.repository';
import { CreateShipmentBody, UpdateShipmentBody } from './admin-shipments.dto';

function generateShipmentNumber(): string {
  const date = new Date();
  const ymd = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
  const suffix = randomBytes(3).toString('hex').toUpperCase();
  return `SHP-${ymd}-${suffix}`;
}

@Injectable()
export class AdminShipmentsService {
  constructor(
    private readonly repo: AdminShipmentsRepository,
    private readonly orders: OrdersRepository,
    private readonly production: AdminProductionRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  list(filter: { q?: string; status?: string; orderId?: string; page?: number; pageSize?: number }) {
    return this.repo.list({
      q: filter.q,
      status: filter.status as ShipmentStatus | undefined,
      orderId: filter.orderId,
      page: filter.page,
      pageSize: filter.pageSize,
    });
  }

  get(id: string): AdminShipmentDto {
    const shipment = this.repo.get(id);
    if (!shipment) throw new NotFoundException(`Shipment not found: ${id}`);
    return shipment;
  }

  create(body: CreateShipmentBody, actor: AdminUserDto): AdminShipmentDto {
    const order = this.orders.get(body.orderId);
    if (!order) throw new NotFoundException(`Order not found: ${body.orderId}`);

    const id = `shp_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const currency = (body.currency ?? order.total.currency) as Currency;
    const shippingCost =
      body.shippingCostMinor !== undefined
        ? { amountMinor: body.shippingCostMinor, currency }
        : null;
    const status = body.status ?? (body.trackingNumber ? 'in_transit' : 'pending');

    const shipment: AdminShipmentDto = {
      id,
      shipmentNumber: generateShipmentNumber(),
      orderId: order.id,
      orderNumber: order.orderNumber,
      productionJobIds: body.productionJobIds ?? [],
      carrier: body.carrier ?? null,
      trackingNumber: body.trackingNumber ?? null,
      trackingUrl: body.trackingUrl ?? null,
      shippingMethod: body.shippingMethod,
      shippingCost,
      status,
      shippedAt: status === 'in_transit' || status === 'out_for_delivery' || status === 'delivered'
        ? now
        : null,
      estimatedDeliveryAt: body.estimatedDeliveryAt ?? null,
      deliveredAt: status === 'delivered' ? now : null,
      packageWeightGrams: body.packageWeightGrams ?? null,
      notes: body.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    this.repo.save(shipment);

    // Mark linked production jobs as shipped if a tracking number was provided.
    if (shipment.trackingNumber && shipment.productionJobIds.length > 0) {
      for (const jobId of shipment.productionJobIds) {
        this.production.update(jobId, { status: 'shipped' });
      }
    }

    if (shipment.status === 'in_transit' || shipment.status === 'out_for_delivery') {
      this.orders.setStatus(order.id, 'shipped');
    } else if (shipment.status === 'delivered') {
      this.orders.setStatus(order.id, 'delivered');
    }

    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Shipment',
      entityId: id,
      action: 'create',
      payload: {
        orderNumber: order.orderNumber,
        carrier: shipment.carrier,
        trackingNumber: shipment.trackingNumber,
      },
      summary: `created shipment ${shipment.shipmentNumber} for ${order.orderNumber}`,
    });
    return shipment;
  }

  update(id: string, body: UpdateShipmentBody, actor: AdminUserDto): AdminShipmentDto {
    const existing = this.get(id);
    const now = new Date().toISOString();

    const patch: Partial<AdminShipmentDto> = {};
    if (body.carrier !== undefined) patch.carrier = body.carrier ?? null;
    if (body.trackingNumber !== undefined) patch.trackingNumber = body.trackingNumber ?? null;
    if (body.trackingUrl !== undefined) patch.trackingUrl = body.trackingUrl ?? null;
    if (body.shippingMethod !== undefined) patch.shippingMethod = body.shippingMethod;
    if (body.shippingCostMinor !== undefined) {
      const currency = (body.currency ?? existing.shippingCost?.currency ?? 'USD') as Currency;
      patch.shippingCost = { amountMinor: body.shippingCostMinor, currency };
    }
    if (body.estimatedDeliveryAt !== undefined) patch.estimatedDeliveryAt = body.estimatedDeliveryAt ?? null;
    if (body.shippedAt !== undefined) patch.shippedAt = body.shippedAt ?? null;
    if (body.deliveredAt !== undefined) patch.deliveredAt = body.deliveredAt ?? null;
    if (body.packageWeightGrams !== undefined) patch.packageWeightGrams = body.packageWeightGrams ?? null;
    if (body.notes !== undefined) patch.notes = body.notes ?? null;

    const previousStatus = existing.status;
    if (body.status !== undefined && body.status !== previousStatus) {
      patch.status = body.status;
      if (body.status === 'in_transit' && !existing.shippedAt) patch.shippedAt = now;
      if (body.status === 'delivered' && !existing.deliveredAt) patch.deliveredAt = now;
    }

    const updated = this.repo.update(id, patch);
    if (!updated) throw new NotFoundException(`Shipment not found: ${id}`);

    if (body.status === 'in_transit' || body.status === 'out_for_delivery') {
      this.orders.setStatus(updated.orderId, 'shipped');
    } else if (body.status === 'delivered') {
      this.orders.setStatus(updated.orderId, 'delivered');
    }

    const action = body.status && body.status !== previousStatus ? 'status_change' : 'update';
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Shipment',
      entityId: id,
      action,
      payload: { keys: Object.keys(patch), from: previousStatus, to: body.status ?? previousStatus },
      summary: `updated shipment ${updated.shipmentNumber}`,
    });
    return updated;
  }

  /**
   * Customer-safe tracking lookup (anonymous endpoint). We deliberately strip
   * supplier names, internal notes, and shipping cost so customers never see
   * back-office context.
   */
  trackByOrderNumber(orderNumber: string): OrderTrackingDto {
    const order = this.orders.getByNumber(orderNumber);
    if (!order) throw new NotFoundException(`Order not found: ${orderNumber}`);

    const shipments = this.repo.listForOrder(order.id).map(toPublic);
    const lastUpdatedAt = shipments.reduce<string>(
      (latest, s) => {
        const ts = s.deliveredAt ?? s.shippedAt ?? '';
        return ts > latest ? ts : latest;
      },
      order.updatedAt,
    );
    return {
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      shipments,
      lastUpdatedAt,
    };
  }
}

function toPublic(shipment: AdminShipmentDto): PublicShipmentDto {
  return {
    shipmentNumber: shipment.shipmentNumber,
    carrier: shipment.carrier ?? null,
    trackingNumber: shipment.trackingNumber ?? null,
    trackingUrl: shipment.trackingUrl ?? null,
    shippingMethod: shipment.shippingMethod,
    status: shipment.status,
    shippedAt: shipment.shippedAt ?? null,
    estimatedDeliveryAt: shipment.estimatedDeliveryAt ?? null,
    deliveredAt: shipment.deliveredAt ?? null,
  };
}
