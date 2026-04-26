import { Injectable } from '@nestjs/common';

import type { OrderDto, OrderStatus } from '@custom-merch/shared';

/** In-memory orders store. Future Prisma drop-in. */
@Injectable()
export class OrdersRepository {
  private readonly orders = new Map<string, OrderDto>();
  private readonly byNumber = new Map<string, string>();

  save(order: OrderDto): OrderDto {
    this.orders.set(order.id, order);
    this.byNumber.set(order.orderNumber, order.id);
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
    return updated;
  }

  /** List orders placed under a given anonymous cart session, newest first. */
  listForSession(sessionId: string): OrderDto[] {
    return Array.from(this.orders.values())
      .filter((o) => o.cartSessionId === sessionId)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }
}
