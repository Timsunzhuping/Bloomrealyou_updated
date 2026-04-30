import type { Locale } from '../constants/locales';
import type { OrderStatus } from '../constants/statuses';

import type { Address, Brand, IsoDateString, Money, Timestamps } from './common';
import type { CustomerDesignId } from './customization';
import type { ProductId, ProductVariantId } from './product';
import type { OrganizationId, UserId } from './user';

export type OrderId = Brand<string, 'OrderId'>;
export type OrderItemId = Brand<string, 'OrderItemId'>;
/** Human-readable order number (e.g. `ORD-20260426-A7BC92`). */
export type OrderNumber = Brand<string, 'OrderNumber'>;

export interface Order extends Timestamps {
  id: OrderId;
  orderNumber: OrderNumber;
  customerUserId: UserId;
  organizationId?: OrganizationId | null;
  status: OrderStatus;
  locale: Locale;
  /** Snapshot of where the order ships to. */
  shippingAddress: Address;
  /** Snapshot of where the invoice goes. */
  billingAddress: Address;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  /** Promo code applied at checkout (if any). */
  promoCode?: string | null;
  /** Order-level rush / expedite surcharge. */
  rushFee?: Money | null;
  /** Notes captured at checkout (gift message, internal note, etc.). */
  customerNotes?: string;
  internalNotes?: string;
  placedAt: IsoDateString;
  /** Set when status becomes 'cancelled' / 'refunded'. */
  cancelledAt?: IsoDateString | null;
  refundedAt?: IsoDateString | null;
}

export interface OrderItem extends Timestamps {
  id: OrderItemId;
  orderId: OrderId;
  productId: ProductId;
  variantId: ProductVariantId;
  designId?: CustomerDesignId | null;
  /** Snapshot of product name at order time (independent of later edits). */
  productNameSnapshot: string;
  /** Snapshot of variant SKU at order time. */
  variantSkuSnapshot: string;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  /**
   * Snapshot of customizations applied to this line item. Mirrors
   * {@link CartItem.customizations} but is frozen on order placement.
   */
  customizations?: Record<string, unknown>;
}
