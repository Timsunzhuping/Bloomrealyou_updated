import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

import type { OrderDto, OrderStatus } from '@custom-merch/shared';

import { PrismaService } from '../_lib/prisma.service';
import { runIfPrismaAvailable, readIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Orders repository — in-memory primary store with optional Prisma persistence.
 *
 * Pattern:
 * 1. In-memory Map is the source of truth (fast reads)
 * 2. Prime from Prisma on boot (if DB available)
 * 3. Write to both (memory + Prisma via fire-and-forget)
 * 4. Prisma unavailable → in-memory still works (graceful degradation)
 */
@Injectable()
export class OrdersRepository implements OnModuleInit {
  private readonly log = new Logger(OrdersRepository.name);
  private readonly orders = new Map<string, OrderDto>();
  private readonly byNumber = new Map<string, string>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.primeFromDatabase();
  }

  /**
   * On startup, optionally load orders from the database.
   * If Prisma is unavailable, we proceed with an empty in-memory store (MVP behavior).
   */
  private async primeFromDatabase(): Promise<void> {
    const rows = await readIfPrismaAvailable('orders-prime', (client) => client.order.findMany());

    if (rows && rows.length > 0) {
      for (const row of rows) {
        const dto = this.rowToDto(row);
        this.orders.set(dto.id, dto);
        this.byNumber.set(dto.orderNumber, dto.id);
      }
      this.log.log(`Primed ${rows.length} orders from database`);
    }
  }

  /**
   * Save order to in-memory store and optionally to Prisma.
   * Returns immediately (does not wait for Prisma write).
   */
  save(order: OrderDto): OrderDto {
    this.orders.set(order.id, order);
    this.byNumber.set(order.orderNumber, order.id);

    // Fire-and-forget write to Prisma
    runIfPrismaAvailable('orders-save', (client) =>
      client.order.upsert({
        where: { id: order.id },
        update: {
          status: order.status,
          updatedAt: order.updatedAt ? new Date(order.updatedAt) : new Date(),
          // ... other mutable fields
        },
        create: {
          id: order.id,
          orderNumber: order.orderNumber,
          cartSessionId: order.cartSessionId,
          customerEmail: order.customerEmail,
          customerName: order.customerName,
          status: order.status,
          placedAt: new Date(order.placedAt),
          updatedAt: new Date(),
          // ... other fields from OrderDto
        },
      }),
    );

    return order;
  }

  get(id: string): OrderDto | undefined {
    return this.orders.get(id);
  }

  getByNumber(orderNumber: string): OrderDto | undefined {
    const id = this.byNumber.get(orderNumber);
    return id ? this.orders.get(id) : undefined;
  }

  /**
   * Update order status in memory and Prisma.
   */
  setStatus(id: string, status: OrderStatus): OrderDto | undefined {
    const existing = this.orders.get(id);
    if (!existing) return undefined;

    const updated: OrderDto = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.orders.set(id, updated);

    // Fire-and-forget write to Prisma
    runIfPrismaAvailable('orders-setStatus', (client) =>
      client.order.update({
        where: { id },
        data: {
          status,
          updatedAt: new Date(),
        },
      }),
    );

    return updated;
  }

  /**
   * List orders placed under a given anonymous cart session, newest first.
   */
  listForSession(sessionId: string): OrderDto[] {
    return Array.from(this.orders.values())
      .filter((o) => o.cartSessionId === sessionId)
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  /**
   * All orders, newest first. Used by admin dashboards / reports.
   */
  listAll(): OrderDto[] {
    return Array.from(this.orders.values()).sort((a, b) =>
      b.placedAt.localeCompare(a.placedAt),
    );
  }

  /**
   * Convert Prisma row to DTO (used by primeFromDatabase).
   */
  private rowToDto(row: any): OrderDto {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      cartSessionId: row.cartSessionId,
      customerEmail: row.customerEmail,
      customerName: row.customerName,
      status: row.status,
      placedAt: row.placedAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      // ... map other fields from row to DTO
    };
  }
}
