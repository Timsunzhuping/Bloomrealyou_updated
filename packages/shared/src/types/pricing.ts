/**
 * Pricing engine inputs and outputs. Money values are always represented as
 * minor-unit integers via the {@link Money} structure to avoid float drift.
 */
import type { Currency } from '../constants/currencies';
import type { PrintMethod } from '../constants/print-methods';

import type { Money } from './common';
import type { CheckoutShippingMethod } from './order-dto';

export interface PricingInput {
  productId: string;
  variantId?: string | null;
  quantity: number;
  printMethod?: PrintMethod;
  /** Stable print-area keys (e.g. ["front", "back"]). Length contributes to the print fee. */
  printAreas?: string[];
  /** ISO 3166-1 alpha-2 (e.g. "US"). Drives the shipping rate band. */
  shippingCountry?: string;
  /** Customer-selected checkout service level. */
  shippingMethod?: CheckoutShippingMethod;
  rush?: boolean;
  currency?: Currency;
}

export interface PricingLineItem {
  /** Stable code, e.g. `subtotal`, `printing_fee`, `rush_fee`. */
  code: string;
  /** Default English label. Front-end localizes via i18n by code when desired. */
  label: string;
  amount: Money;
}

export interface PricingResult {
  currency: Currency;
  unitPrice: Money;
  subtotal: Money;
  printingFee: Money;
  shippingFee: Money;
  rushFee: Money;
  discount: Money;
  total: Money;
  estimatedProductionDays: number;
  estimatedDeliveryDays: number;
  /** Ordered list of contributing line items for receipts / cart UI. */
  breakdown: PricingLineItem[];
}
