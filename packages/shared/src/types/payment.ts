import type { PaymentStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Money, Timestamps } from './common';
import type { OrderId } from './order';

export type PaymentId = Brand<string, 'PaymentId'>;

/** Adapter-neutral payment provider identifier. */
export type PaymentProvider = 'stripe' | 'paypal' | 'manual_invoice';

export interface Payment extends Timestamps {
  id: PaymentId;
  orderId: OrderId;
  provider: PaymentProvider;
  /** External provider reference (e.g. Stripe PaymentIntent id). */
  providerReference: string;
  status: PaymentStatus;
  amount: Money;
  /** Amount refunded so far; ≤ amount. */
  refundedAmount?: Money;
  /** Raw provider event payload, captured for audit. */
  providerMetadata?: Record<string, unknown>;
  authorizedAt?: IsoDateString | null;
  capturedAt?: IsoDateString | null;
  failedAt?: IsoDateString | null;
  failureCode?: string | null;
  failureMessage?: string | null;
}
