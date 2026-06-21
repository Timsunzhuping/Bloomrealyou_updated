import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { OrderDto, OrderStatus } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'order';

/**
 * Orders repository — in-memory map (source of truth at runtime) made durable
 * via the {@link SnapshotStore}.
 *
 * - On boot: prime the in-memory map from `entity_snapshots` (kind="order").
 * - On write: update the map AND write-through the full DTO as JSON.
 * - DB unavailable (no DATABASE_URL): runs purely in-memory (dev / CI).
 *
 * The full {@link OrderDto} is snapshotted verbatim, so there is no field
 * mapping to drift from the schema — the durable copy is exactly the DTO the
 * service layer produces.
 */
@Injectable()
export class OrdersRepository implements OnModuleInit {
  private readonly log = new Logger(OrdersRepository.name);
  private readonly orders = new Map<string, OrderDto>();
  private readonly byNumber = new Map<string, string>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<OrderDto>(KIND);
    for (const row of rows) {
      this.orders.set(row.data.id, row.data);
      this.byNumber.set(row.data.orderNumber, row.data.id);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} orders from durable store`);
    }
  }

  save(order: OrderDto): OrderDto {
    this.orders.set(order.id, order);
    this.byNumber.set(order.orderNumber, order.id);
    this.snapshots.put(KIND, order.id, order, order.orderNumber);
    return order;
  }

  get(id: string): OrderDto | undefined {
    return this.orders.get(id);
  }

  getByNumber(orderNumber: string): OrderDto | undefined {
    const id = this.byNumber.get(orderNumber);
    return id ? this.orders.get(id) : undefined;
  }

  setStatus(id: string, status: OrderStatus): OrderDto | undefined {
    const existing = this.orders.get(id);
    if (!existing) return undefined;
    const updated: OrderDto = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated);
    this.snapshots.put(KIND, updated.id, updated, updated.orderNumber);
    return updated;
  }

  /** List orders placed under a given anonymous cart session, newest first. */
  listForSession(sessionId: string): OrderDto[] {
    return Array.from(this.orders.values())
      .filter((o) => o.cartSessionId === sessionId)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  /** All orders, newest first. Used by admin dashboards / reports. */
  listAll(): OrderDto[] {
    return Array.from(this.orders.values()).sort((a, b) =>
      b.placedAt.localeCompare(a.placedAt),
    );
  }
}
