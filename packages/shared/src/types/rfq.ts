import type { Locale } from '../constants/locales';
import type { PrintMethod } from '../constants/print-methods';
import type { RFQStatus } from '../constants/statuses';

import type { Address, Brand, IsoDateString, Timestamps } from './common';
import type { ProductId, ProductVariantId } from './product';
import type { OrganizationId, UserId } from './user';

export type RfqId = Brand<string, 'RfqId'>;
export type RfqItemId = Brand<string, 'RfqItemId'>;
/** Human-readable RFQ number (e.g. `RFQ-20260426-A7BC92`). */
export type RfqNumber = Brand<string, 'RfqNumber'>;

/**
 * Request For Quote — the entry point for the corporate / bulk-buy flow.
 * Sales transforms a submitted RFQ into one or more {@link Quote}s.
 */
export interface RFQ extends Timestamps {
  id: RfqId;
  rfqNumber: RfqNumber;
  /** Customer who submitted the RFQ (may be authenticated or guest+claimed later). */
  requesterUserId?: UserId | null;
  organizationId?: OrganizationId | null;
  /** Used when the requester is a guest. */
  guestEmail?: string | null;
  guestName?: string | null;
  guestCompany?: string | null;
  status: RFQStatus;
  locale: Locale;
  /** Required-by date supplied by the buyer. */
  requiredBy?: IsoDateString | null;
  /** Free-form requirements / additional context. */
  notes?: string;
  shippingAddress?: Address;
  /** User-uploaded brief or design references. */
  attachmentUrls: string[];
  assignedSalesUserId?: UserId | null;
  submittedAt: IsoDateString;
  /** Set by sales when work begins. */
  reviewedAt?: IsoDateString | null;
}

export interface RFQItem {
  id: RfqItemId;
  rfqId: RfqId;
  /** Optional reference to a catalog product; null when the buyer describes a new SKU. */
  productId?: ProductId | null;
  variantId?: ProductVariantId | null;
  /** Free-form description used when no productId is provided. */
  description: string;
  quantity: number;
  preferredPrintMethod?: PrintMethod;
  /** Buyer's target unit price expressed as a string to preserve their intent. */
  targetUnitPriceText?: string;
  /** URLs for design references / artwork associated with this line. */
  attachmentUrls: string[];
}
