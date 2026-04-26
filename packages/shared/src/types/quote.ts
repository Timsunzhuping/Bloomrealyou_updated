import type { PrintMethod } from '../constants/print-methods';
import type { QuoteStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Money, Timestamps } from './common';
import type { ProductId, ProductVariantId } from './product';
import type { RfqId } from './rfq';
import type { OrganizationId, UserId } from './user';

export type QuoteId = Brand<string, 'QuoteId'>;
export type QuoteItemId = Brand<string, 'QuoteItemId'>;
/** Human-readable quote number (e.g. `QUO-20260426-A7BC92`). */
export type QuoteNumber = Brand<string, 'QuoteNumber'>;

/** A formal price proposal authored by sales, optionally tied to an RFQ. */
export interface Quote extends Timestamps {
  id: QuoteId;
  quoteNumber: QuoteNumber;
  rfqId?: RfqId | null;
  customerUserId?: UserId | null;
  organizationId?: OrganizationId | null;
  status: QuoteStatus;
  /** Sales user who authored the quote. */
  authorUserId: UserId;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  /** Optional rush surcharge included in `total`. */
  rushFee?: Money | null;
  /** Validity window for the quote. */
  validUntil?: IsoDateString | null;
  /** Customer-facing terms, e.g. "Payment net 30 from invoice date". */
  termsText?: string;
  /** Internal notes (sales-only). */
  internalNotes?: string;
  sentAt?: IsoDateString | null;
  acceptedAt?: IsoDateString | null;
  rejectedAt?: IsoDateString | null;
}

export interface QuoteItem {
  id: QuoteItemId;
  quoteId: QuoteId;
  productId?: ProductId | null;
  variantId?: ProductVariantId | null;
  description: string;
  printMethod?: PrintMethod;
  quantity: number;
  unitPrice: Money;
  lineTotal: Money;
  /** Optional volume discount or surcharge note for the customer. */
  notes?: string;
}
