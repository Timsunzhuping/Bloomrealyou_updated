import { Injectable } from '@nestjs/common';

import type { AdminShipmentDto, ShipmentStatus } from '@custom-merch/shared';

import { tryPersistShipment } from './admin-shipments.prisma-sink';

interface ListFilter {
  q?: string;
  status?: ShipmentStatus;
  orderId?: string;
  page?: number;
  pageSize?: number;
}

@Injectable()
export class AdminShipmentsRepository {
  private readonly shipments = new Map<string, AdminShipmentDto>();

  list(filter: ListFilter = {}): {
    items: AdminShipmentDto[];
    total: number;
    page: number;
    pageSize: number;
  } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    let rows = Array.from(this.shipments.values());
    if (filter.status) rows = rows.filter((s) => s.status === filter.status);
    if (filter.orderId) rows = rows.filter((s) => s.orderId === filter.orderId);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.shipmentNumber.toLowerCase().includes(q) ||
          s.orderNumber.toLowerCase().includes(q) ||
          (s.trackingNumber ?? '').toLowerCase().includes(q),
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

  get(id: string): AdminShipmentDto | undefined {
    return this.shipments.get(id);
  }

  save(shipment: AdminShipmentDto): AdminShipmentDto {
    this.shipments.set(shipment.id, shipment);
    tryPersistShipment(shipment);
    return shipment;
  }

  update(id: string, patch: Partial<AdminShipmentDto>): AdminShipmentDto | undefined {
    const existing = this.shipments.get(id);
    if (!existing) return undefined;
    const next: AdminShipmentDto = {
      ...existing,
      ...patch,
      id: existing.id,
      shipmentNumber: existing.shipmentNumber,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };
    this.shipments.set(id, next);
    tryPersistShipment(next);
    return next;
  }

  /** Public — used by tracking endpoint. */
  listForOrder(orderId: string): AdminShipmentDto[] {
    return Array.from(this.shipments.values())
      .filter((s) => s.orderId === orderId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
