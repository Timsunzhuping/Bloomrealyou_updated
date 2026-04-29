import { Injectable, Logger } from '@nestjs/common';

import type {
  AdminProductionJobDto,
  AdminShipmentDto,
  AdminSupplierDto,
  OrderDto,
} from '@custom-merch/shared';

import { OrdersRepository } from '../orders/orders.repository';

import { NotificationDispatcher } from './notification-dispatcher.service';

export type OrderMilestone =
  | 'order_created'
  | 'payment_succeeded'
  | 'design_revision_required'
  | 'design_approved'
  | 'production_assigned'
  | 'production_started'
  | 'qc_passed'
  | 'qc_failed'
  | 'shipment_created'
  | 'shipment_delivered';

interface ProgressContext {
  job?: AdminProductionJobDto | null;
  supplier?: AdminSupplierDto | null;
  shipment?: AdminShipmentDto | null;
  /** Custom data overrides — merged into the template payload last. */
  extra?: Record<string, unknown>;
}

/**
 * Reusable order-progress notifier.
 *
 * Each milestone resolves to a small fan-out of recipients and template keys:
 *
 *   design_approved       → customer (`order.design_approved`)
 *   production_assigned   → supplier (`supplier.job_assigned`)
 *   production_started    → customer (`order.in_production`)
 *   qc_passed             → customer (`order.qc_passed`)
 *   qc_failed             → customer (`order.qc_failed`)
 *   shipment_created      → customer (`order.shipped`)
 *   shipment_delivered    → customer (`order.delivered`)
 *
 * All sends are fire-and-forget — failures are logged but never bubble. The
 * caller's request always succeeds even if SendGrid is down.
 */
@Injectable()
export class OrderProgressService {
  private readonly log = new Logger(OrderProgressService.name);

  constructor(
    private readonly orders: OrdersRepository,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  /**
   * Schedule notification(s) for an order milestone. Returns a list of the
   * intended recipients so callers can log who they were going to email
   * without awaiting the actual send. Network calls run in the background.
   */
  notify(orderId: string, milestone: OrderMilestone, ctx: ProgressContext = {}): string[] {
    const order = this.orders.get(orderId);
    if (!order) {
      this.log.warn(`notify(${milestone}): order ${orderId} not found`);
      return [];
    }
    const recipients: Array<{ to: string; templateKey: string; subject: string }> = [];

    switch (milestone) {
      case 'order_created':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.confirmation',
            subject: `We received your order ${order.orderNumber}`,
          });
        }
        break;
      case 'payment_succeeded':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.payment_confirmation',
            subject: `Payment received for ${order.orderNumber}`,
          });
        }
        break;
      case 'design_revision_required':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.design_revision_required',
            subject: `We need a small change to your design for ${order.orderNumber}`,
          });
        }
        break;
      case 'design_approved':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.design_approved',
            subject: `Your design for ${order.orderNumber} was approved`,
          });
        }
        break;
      case 'production_assigned':
        if (ctx.supplier?.contactEmail) {
          recipients.push({
            to: ctx.supplier.contactEmail,
            templateKey: 'supplier.job_assigned',
            subject: `New production job ${ctx.job?.jobNumber ?? ''}`,
          });
        }
        break;
      case 'production_started':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.in_production',
            subject: `${order.orderNumber} is now in production`,
          });
        }
        break;
      case 'qc_passed':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.qc_passed',
            subject: `${order.orderNumber} cleared quality control`,
          });
        }
        break;
      case 'qc_failed':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.qc_failed',
            subject: `${order.orderNumber} needs your attention`,
          });
        }
        break;
      case 'shipment_created':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.shipped',
            subject: `${order.orderNumber} is on its way`,
          });
        }
        break;
      case 'shipment_delivered':
        if (order.customerEmail) {
          recipients.push({
            to: order.customerEmail,
            templateKey: 'order.delivered',
            subject: `${order.orderNumber} was delivered`,
          });
        }
        break;
    }

    const data = this.buildPayload(order, milestone, ctx);
    for (const r of recipients) {
      this.dispatcher.enqueue({
        to: r.to,
        channel: 'email',
        templateKey: r.templateKey,
        locale: order.locale,
        subject: r.subject,
        data,
        orderId: order.id,
      });
    }
    return recipients.map((r) => r.to);
  }

  private buildPayload(
    order: OrderDto,
    milestone: OrderMilestone,
    ctx: ProgressContext,
  ): Record<string, unknown> {
    return {
      orderNumber: order.orderNumber,
      milestone,
      jobNumber: ctx.job?.jobNumber,
      supplierName: ctx.supplier?.name,
      shipmentNumber: ctx.shipment?.shipmentNumber,
      carrier: ctx.shipment?.carrier ?? null,
      trackingNumber: ctx.shipment?.trackingNumber ?? null,
      trackingUrl: ctx.shipment?.trackingUrl ?? null,
      trackingPagePath: `/orders/${order.orderNumber}`,
      ...(ctx.extra ?? {}),
    };
  }
}
