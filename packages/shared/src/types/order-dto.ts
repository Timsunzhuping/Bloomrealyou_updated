/**
 * Order wire-format DTOs. Server and client use the same shapes.
 */
import type { Currency } from '../constants/currencies';
import type { Locale } from '../constants/locales';
import type { PrintMethod } from '../constants/print-methods';
import type { OrderStatus } from '../constants/statuses';

import type { Address, Money } from './common';

export type CheckoutShippingMethod = 'standard' | 'express' | 'rush';

export interface OrderItemDto {
  id: string;
  orderId: string;
  productId: string;
  variantId: string;
  customizationId: string | null;
  /** Frozen at order placement so future product edits don't rewrite history. */
  productNameSnapshot: string;
  variantSkuSnapshot: string;
  variantAttributesSnapshot: Record<string, string>;
  /** Snapshot of the customer's design payload. */
  designJsonSnapshot: Record<string, unknown> | null;
  previewImageUrl: string | null;
  productionFileUrl: string | null;
  printMethod: PrintMethod | null;
  printAreas: string[];
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
}

export interface OrderDto {
  id: string;
  orderNumber: string;
  customerUserId: string | null;
  customerEmail: string | null;
  status: OrderStatus;
  locale: Locale;
  currency: Currency;
  shippingAddress: Address;
  billingAddress: Address;
  /** Selected logical shipping method (e.g. "standard" | "express" | "rush"). */
  shippingMethod: CheckoutShippingMethod;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  items: OrderItemDto[];
  notes?: string | null;
  /** Cart session id this order was placed from (for back-traceability). */
  cartSessionId?: string | null;
  placedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  /** Cart session whose items become the order. */
  cartSessionId: string;
  customerEmail: string;
  shippingAddress: Address;
  /** When omitted the shipping address is reused. */
  billingAddress?: Address;
  shippingMethod?: OrderDto['shippingMethod'];
  locale?: Locale;
  notes?: string;
}
