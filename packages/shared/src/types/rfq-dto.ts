import type { Locale } from '../constants/locales';
import type { ProductCategory } from '../constants/product-categories';
import type { RFQStatus } from '../constants/statuses';

import type { CountryCode, IsoDateString } from './common';

/**
 * Coarse budget bands used in the corporate RFQ form. Stored as a string union
 * because buyers describe budgets in ranges, not exact figures.
 */
export const RFQ_BUDGET_RANGES = [
  'under_1k',
  '1k_5k',
  '5k_20k',
  '20k_50k',
  '50k_plus',
  'unspecified',
] as const;
export type RFQBudgetRange = (typeof RFQ_BUDGET_RANGES)[number];

export const RFQ_NOTE_MAX_LENGTH = 2000;
export const RFQ_LOGO_MAX_BYTES = 6_500_000;

/** Public RFQ wire format returned by the API. */
export interface RfqDto {
  id: string;
  rfqNumber: string;
  status: RFQStatus;
  locale: Locale;
  companyName: string;
  contactName: string;
  email: string;
  phone?: string | null;
  country: CountryCode;
  productCategories: ProductCategory[];
  estimatedQuantity: number;
  targetDeliveryDate?: IsoDateString | null;
  budgetRange: RFQBudgetRange;
  needSample: boolean;
  note?: string | null;
  /** Object-store URL of the uploaded brand logo (data: URL in dev). */
  logoFileUrl?: string | null;
  logoFileName?: string | null;
  /** Set when sales converts the RFQ into an order. */
  convertedQuoteId?: string | null;
  convertedOrderId?: string | null;
  submittedAt: IsoDateString;
  reviewedAt?: IsoDateString | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/** POST /rfqs body. */
export interface CreateRFQInput {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  country: CountryCode;
  productCategories: ProductCategory[];
  estimatedQuantity: number;
  targetDeliveryDate?: IsoDateString;
  budgetRange: RFQBudgetRange;
  needSample?: boolean;
  note?: string;
  locale?: Locale;
  /** Optional `data:` URL for the uploaded logo. */
  logoDataUrl?: string;
  logoFileName?: string;
}

/** PATCH /admin/rfqs/:id/status body. */
export interface UpdateRFQStatusInput {
  status: RFQStatus;
  /** Optional internal note attached to the status change. */
  note?: string;
}
