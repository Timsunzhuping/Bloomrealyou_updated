import type { Currency } from '../constants/currencies';
import type { Locale } from '../constants/locales';
import type { ProductCategory } from '../constants/product-categories';
import type { QuoteStatus } from '../constants/statuses';

import type { Address, IsoDateString, Money } from './common';

export const QUOTE_NOTES_MAX_LENGTH = 2000;

export interface QuoteItemDto {
  id: string;
  quoteId: string;
  /** Optional reference into the catalog. */
  productId?: string | null;
  /** Free-text description used when no productId is supplied. */
  description: string;
  category?: ProductCategory | null;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  notes?: string | null;
}

export interface QuoteDto {
  id: string;
  quoteNumber: string;
  rfqId: string | null;
  status: QuoteStatus;
  locale: Locale;
  currency: Currency;
  customerEmail: string;
  customerName: string;
  companyName: string;
  items: QuoteItemDto[];
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  validUntil?: IsoDateString | null;
  termsText?: string | null;
  internalNotes?: string | null;
  sentAt?: IsoDateString | null;
  acceptedAt?: IsoDateString | null;
  rejectedAt?: IsoDateString | null;
  convertedOrderId?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateQuoteItemInput {
  productId?: string;
  description: string;
  category?: ProductCategory;
  quantity: number;
  /** Unit price in minor units of `currency`. */
  unitPriceMinor: number;
  notes?: string;
}

/** POST /admin/rfqs/:id/quotes body. */
export interface CreateQuoteInput {
  currency?: Currency;
  items: CreateQuoteItemInput[];
  shippingMinor?: number;
  taxMinor?: number;
  discountMinor?: number;
  validUntil?: IsoDateString;
  termsText?: string;
  internalNotes?: string;
}

/** PATCH /admin/quotes/:id body. */
export interface UpdateQuoteInput {
  status?: QuoteStatus;
  items?: CreateQuoteItemInput[];
  shippingMinor?: number;
  taxMinor?: number;
  discountMinor?: number;
  validUntil?: IsoDateString;
  termsText?: string;
  internalNotes?: string;
}

/** POST /admin/quotes/:id/convert-to-order body. */
export interface ConvertQuoteToOrderInput {
  shippingAddress: Address;
  billingAddress?: Address;
  shippingMethod?: 'standard' | 'express' | 'rush';
  notes?: string;
}
