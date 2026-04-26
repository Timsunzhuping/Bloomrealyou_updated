import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import type {
  AdminOrderDetailExtras,
  AdminUserDto,
  OrderDto,
  OrderStatus,
} from '@custom-merch/shared';

import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { OrdersRepository } from '../orders/orders.repository';

import { AdminOrdersExtrasRepository } from './admin-orders.repository';

interface ListFilter {
  q?: string;
  status?: OrderStatus;
  flaggedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface AdminOrderSummary extends OrderDto, AdminOrderDetailExtras {}

@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly extras: AdminOrdersExtrasRepository,
    private readonly audit: AuditLogsRepository,
  ) {}

  list(filter: ListFilter = {}): { items: AdminOrderSummary[]; total: number; page: number; pageSize: number } {
    const page = clamp(filter.page ?? 1, 1, 999);
    const pageSize = clamp(filter.pageSize ?? 20, 1, 100);
    let rows = this.orders.listAll();
    if (filter.status) rows = rows.filter((o) => o.status === filter.status);
    if (filter.q) {
      const q = filter.q.toLowerCase();
      rows = rows.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          (o.customerEmail ?? '').toLowerCase().includes(q),
      );
    }
    if (filter.flaggedOnly) {
      rows = rows.filter((o) => this.extras.get(o.id).isFlaggedException);
    }
    const total = rows.length;
    const sliced = rows.slice((page - 1) * pageSize, page * pageSize);
    const items = sliced.map((o) => this.merge(o));
    return { items, total, page, pageSize };
  }

  get(id: string): AdminOrderSummary {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    return this.merge(order);
  }

  setStatus(
    id: string,
    input: { status: OrderStatus; note?: string; flagException?: boolean },
    actor: AdminUserDto,
  ): AdminOrderSummary {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    if (!isValidOrderStatus(input.status)) {
      throw new BadRequestException(`Unknown order status: ${input.status}`);
    }
    const previous = order.status;
    this.orders.setStatus(id, input.status);
    if (typeof input.flagException === 'boolean') {
      this.extras.setFlagged(id, input.flagException);
    }
    if (input.note && input.note.trim().length > 0) {
      this.extras.appendNote(id, input.note.trim(), {
        id: actor.id,
        fullName: actor.fullName,
      });
    }
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Order',
      entityId: id,
      action: 'status_change',
      payload: { from: previous, to: input.status, flagException: input.flagException ?? false },
      summary: `${order.orderNumber}: ${previous} → ${input.status}`,
    });
    return this.get(id);
  }

  appendNote(id: string, body: string, actor: AdminUserDto): AdminOrderSummary {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException(`Order not found: ${id}`);
    this.extras.appendNote(id, body, { id: actor.id, fullName: actor.fullName });
    this.audit.append({
      actorUserId: actor.id,
      actorName: actor.fullName,
      entityType: 'Order',
      entityId: id,
      action: 'update',
      summary: `note added to ${order.orderNumber}`,
    });
    return this.get(id);
  }

  private merge(order: OrderDto): AdminOrderSummary {
    return { ...order, ...this.extras.get(order.id) };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

const ORDER_STATUSES_RUNTIME: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'pending',
  'pending_payment',
  'paid',
  'design_review',
  'design_approved',
  'production_assigned',
  'in_production',
  'quality_inspection',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'exception',
]);

function isValidOrderStatus(s: string): s is OrderStatus {
  return ORDER_STATUSES_RUNTIME.has(s as OrderStatus);
}
