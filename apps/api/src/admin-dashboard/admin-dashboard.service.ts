import { Injectable } from '@nestjs/common';

import type { AdminDashboardSnapshot, OrderDto, OrderStatus, RfqDto } from '@custom-merch/shared';

import { OrdersRepository } from '../orders/orders.repository';
import { RFQsRepository } from '../rfqs/rfqs.repository';

const PRODUCTION_PENDING: ReadonlySet<OrderStatus> = new Set([
  'pending_payment',
  'paid',
  'design_review',
  'design_approved',
]);
const PRODUCTION_IN_PROGRESS: ReadonlySet<OrderStatus> = new Set([
  'production_assigned',
  'in_production',
  'quality_inspection',
]);
const PRODUCTION_PENDING_SHIPMENT: ReadonlySet<OrderStatus> = new Set(['quality_inspection']);
const EXCEPTION: ReadonlySet<OrderStatus> = new Set(['exception', 'cancelled', 'refunded']);
const DESIGN_REVIEW_STATUSES: ReadonlySet<OrderStatus> = new Set(['design_review']);

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly rfqs: RFQsRepository,
  ) {}

  snapshot(now: Date = new Date()): AdminDashboardSnapshot {
    const todayKey = now.toISOString().slice(0, 10);
    const allOrders: OrderDto[] = this.orders.listAll();
    const todaysOrders = allOrders.filter((o) => o.placedAt.startsWith(todayKey));

    const gmvMinor = todaysOrders.reduce((sum, o) => sum + o.total.amountMinor, 0);
    const currency = todaysOrders[0]?.total.currency ?? 'USD';

    const designsPendingReview = allOrders.filter((o) => DESIGN_REVIEW_STATUSES.has(o.status)).length;
    const ordersPendingProduction = allOrders.filter((o) => PRODUCTION_PENDING.has(o.status)).length;
    const ordersInProduction = allOrders.filter((o) => PRODUCTION_IN_PROGRESS.has(o.status)).length;
    const ordersPendingShipment = allOrders.filter((o) => PRODUCTION_PENDING_SHIPMENT.has(o.status)).length;
    const ordersExceptions = allOrders.filter((o) => EXCEPTION.has(o.status)).length;

    const rfqsOpen = this.rfqs
      .list()
      .filter((rfq: RfqDto) => rfq.status !== 'closed' && rfq.status !== 'converted_to_order')
      .length;

    return {
      ordersToday: todaysOrders.length,
      gmvToday: { amountMinor: gmvMinor, currency },
      designsPendingReview,
      ordersPendingProduction,
      ordersInProduction,
      ordersPendingShipment,
      ordersExceptions,
      rfqsOpen,
      generatedAt: now.toISOString(),
    };
  }
}

