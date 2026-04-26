import type { CartStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Money, Timestamps } from './common';
import type { CustomerDesignId } from './customization';
import type { ProductId, ProductVariantId } from './product';
import type { OrganizationId, UserId } from './user';

export type CartId = Brand<string, 'CartId'>;
export type CartItemId = Brand<string, 'CartItemId'>;

export interface Cart extends Timestamps {
  id: CartId;
  /** Null when the cart belongs to an unauthenticated visitor (cookie-based). */
  userId?: UserId | null;
  organizationId?: OrganizationId | null;
  status: CartStatus;
  /** Currency the cart is priced in; locked at first item add. */
  subtotal: Money;
  shipping: Money;
  tax: Money;
  total: Money;
  /** Promo code applied at the cart level. */
  promoCode?: string | null;
  expiresAt?: IsoDateString | null;
  /** Convenience: derived from items[].length. Server is source of truth. */
  itemCount: number;
}

export interface CartItem extends Timestamps {
  id: CartItemId;
  cartId: CartId;
  productId: ProductId;
  variantId: ProductVariantId;
  designId?: CustomerDesignId | null;
  quantity: number;
  /** Unit price snapshot at the time of add (after volume tier resolution). */
  unitPrice: Money;
  /** Quantity * unitPrice plus any per-item surcharges. */
  lineTotal: Money;
  /**
   * Free-form per-item options captured by the customizer (e.g. extra print
   * areas, rush production). Persisted as a JSON blob.
   */
  customizations?: Record<string, unknown>;
}
