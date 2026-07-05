/**
 * Cart wire-format DTOs. Same type definitions are used by NestJS controllers
 * and the SDK so server / client stay in lockstep.
 */
import type { Currency } from '../constants/currencies';
import type { PrintMethod } from '../constants/print-methods';
import type { CartStatus } from '../constants/statuses';

import type { Money } from './common';
import type { CheckoutShippingMethod } from './order-dto';
import type { PricingResult } from './pricing';

export interface CartItemDto {
  id: string;
  productId: string;
  variantId: string;
  /** Optional design id when this line is a customised product. */
  customizationId?: string | null;
  quantity: number;
  unitPrice: Money;
  totalPrice: Money;
  previewImageUrl?: string | null;
  printMethod?: PrintMethod | null;
  printAreas: string[];
  /** Snapshot of the pricing breakdown at the time of last add / recalc. */
  pricingSnapshot: PricingResult;
  /** Snapshot of the variant SKU + product name at add time. */
  productNameSnapshot: string;
  variantSkuSnapshot: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartDto {
  id: string;
  /** Anonymous session id when the cart belongs to an unauthenticated visitor. */
  sessionId: string | null;
  userId: string | null;
  status: CartStatus;
  currency: Currency;
  items: CartItemDto[];
  itemCount: number;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  promoCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddCartItemInput {
  productId: string;
  variantId: string;
  customizationId?: string | null;
  quantity: number;
  printMethod?: PrintMethod;
  printAreas?: string[];
  rush?: boolean;
  shippingCountry?: string;
  shippingMethod?: CheckoutShippingMethod;
  /** When set, used to display the customised mockup in the cart line. */
  previewImageUrl?: string | null;
  /** Optional snapshots passed through from the front-end (otherwise inferred). */
  productNameSnapshot?: string;
  variantSkuSnapshot?: string;
}

export interface UpdateCartItemInput {
  quantity?: number;
  printMethod?: PrintMethod;
  printAreas?: string[];
  rush?: boolean;
  shippingCountry?: string;
  shippingMethod?: CheckoutShippingMethod;
}

export interface RecalculateCartInput {
  /** Optional override applied to every line item (e.g. ship-to country change). */
  shippingCountry?: string;
  shippingMethod?: CheckoutShippingMethod;
  rush?: boolean;
}
