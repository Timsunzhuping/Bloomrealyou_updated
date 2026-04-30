import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import {
  ORDER_STATUS_TO_TIMELINE,
  type AccountOrderDetailDto,
  type AccountProfileDto,
  type AccountQuoteSummaryDto,
  type CartDto,
  type CustomerDesignDto,
  type OrderDto,
  type OrderTimelineEvent,
  type OrderTimelineKey,
  type SavedAddressDto,
} from '@custom-merch/shared';

import { CartService } from '../cart/cart.service';
import { CustomizationsRepository } from '../customizations/customizations.repository';
import { NotificationDispatcher } from '../notifications/notification-dispatcher.service';
import { OrdersRepository } from '../orders/orders.repository';

import { AccountRepository } from './account.repository';

const TIMELINE_ORDER: OrderTimelineKey[] = [
  'placed',
  'payment_confirmed',
  'design_review',
  'in_production',
  'shipped',
  'delivered',
];

const DEFAULT_LABELS: Record<OrderTimelineKey, string> = {
  placed: 'Order placed',
  payment_confirmed: 'Payment confirmed',
  design_review: 'Design review',
  in_production: 'In production',
  shipped: 'Shipped',
  delivered: 'Delivered',
};

@Injectable()
export class AccountService {
  constructor(
    private readonly account: AccountRepository,
    private readonly orders: OrdersRepository,
    private readonly designs: CustomizationsRepository,
    private readonly carts: CartService,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  // -- Profile -----------------------------------------------------------

  getProfile(sessionId: string): AccountProfileDto {
    return this.account.ensureProfile(sessionId);
  }

  updateProfile(sessionId: string, patch: Partial<AccountProfileDto>): AccountProfileDto {
    const previous = this.account.ensureProfile(sessionId);
    const next = this.account.updateProfile(sessionId, patch);
    // First-time email set is the closest thing to "user registration" in
    // the anonymous-session MVP — fire the welcome email exactly once.
    if (!previous.email && next.email) {
      const firstName = (next.fullName ?? next.email).split(/\s+/)[0];
      this.dispatcher.enqueue({
        to: next.email,
        templateKey: 'user.welcome',
        locale: next.locale,
        subject: `Welcome to Bloomrealyou, ${firstName}`,
        data: { firstName },
      });
    }
    return next;
  }

  // -- Addresses ---------------------------------------------------------

  listAddresses(sessionId: string): SavedAddressDto[] {
    return this.account.listAddresses(sessionId);
  }

  saveAddress(sessionId: string, input: Parameters<AccountRepository['saveAddress']>[1]): SavedAddressDto {
    return this.account.saveAddress(sessionId, input);
  }

  updateAddress(
    sessionId: string,
    id: string,
    patch: Parameters<AccountRepository['updateAddress']>[2],
  ): SavedAddressDto {
    const next = this.account.updateAddress(sessionId, id, patch);
    if (!next) throw new NotFoundException(`Address not found: ${id}`);
    return next;
  }

  removeAddress(sessionId: string, id: string): { ok: true } {
    const ok = this.account.removeAddress(sessionId, id);
    if (!ok) throw new NotFoundException(`Address not found: ${id}`);
    return { ok: true };
  }

  // -- Orders ------------------------------------------------------------

  listOrders(sessionId: string): OrderDto[] {
    return this.orders.listForSession(sessionId);
  }

  getOrderDetail(sessionId: string, orderNumber: string): AccountOrderDetailDto {
    const order = this.orders.getByNumber(orderNumber);
    if (!order) throw new NotFoundException(`Order not found: ${orderNumber}`);
    if (order.cartSessionId && order.cartSessionId !== sessionId) {
      throw new ForbiddenException('You do not have access to this order.');
    }
    return {
      order,
      paymentStatus: null,
      timeline: this.buildTimeline(order),
      trackingNumber: null,
      trackingUrl: null,
    };
  }

  private buildTimeline(order: OrderDto): OrderTimelineEvent[] {
    const reachedKey = ORDER_STATUS_TO_TIMELINE[order.status] ?? null;
    const reachedIdx = reachedKey ? TIMELINE_ORDER.indexOf(reachedKey) : -1;
    return TIMELINE_ORDER.map((key, i) => {
      let state: OrderTimelineEvent['state'] = 'upcoming';
      if (reachedIdx >= 0) {
        if (i < reachedIdx) state = 'completed';
        else if (i === reachedIdx) state = 'current';
      }
      let occurredAt: string | null = null;
      if (key === 'placed') occurredAt = order.placedAt;
      if (key === 'payment_confirmed' && order.status !== 'pending_payment' && order.status !== 'pending') {
        occurredAt = order.updatedAt;
      }
      return { key, label: DEFAULT_LABELS[key], state, occurredAt };
    });
  }

  // -- Designs -----------------------------------------------------------

  listDesigns(sessionId: string): CustomerDesignDto[] {
    return this.designs.listForSession(sessionId);
  }

  /** Re-add a saved design to the cart. Reuses CartService for pricing. */
  reorder(
    sessionId: string,
    designId: string,
    opts: { shippingCountry?: string; rush?: boolean } = {},
  ): CartDto {
    const design = this.designs.get(designId);
    if (!design) throw new NotFoundException(`Design not found: ${designId}`);
    if (!design.variantId) {
      // Cart requires a variant. Pick the variant from the design's product.
      // Real impl: ask the customer to pick a variant first.
      throw new NotFoundException('Design has no variant — open it to choose options.');
    }
    return this.carts.addItem(sessionId, {
      productId: design.productId,
      variantId: design.variantId,
      customizationId: design.id,
      quantity: 1,
      previewImageUrl: design.previewImageUrl,
      shippingCountry: opts.shippingCountry,
      rush: opts.rush,
    });
  }

  // -- Quotes ------------------------------------------------------------

  /** Placeholder — wired up to the RFQ/Quote modules in WP-11. */
  listQuotes(_sessionId: string): AccountQuoteSummaryDto[] {
    return [];
  }
}
