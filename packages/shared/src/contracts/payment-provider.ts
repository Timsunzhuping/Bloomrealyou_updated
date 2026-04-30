/**
 * Adapter contract for payment providers (Stripe, PayPal, manual invoice).
 *
 * Every provider works with abstract Money values + an opaque metadata bag.
 * The platform never imports a specific SDK — calls go through this contract
 * so providers can be swapped per region or A/B test.
 */
import type { Currency } from '../constants/currencies';
import type { Money } from '../types/common';

export type PaymentProviderName = 'stripe' | 'paypal' | 'manual_invoice';

export interface CreateIntentInput {
  /** Internal order id this intent is bound to. */
  orderId: string;
  /** Customer-facing order number (used for receipts). */
  orderNumber: string;
  amount: Money;
  /** Optional customer email for receipts. */
  customerEmail?: string;
  /** Free-form metadata persisted with the intent. */
  metadata?: Record<string, string>;
}

export interface CreateIntentResult {
  provider: PaymentProviderName;
  /** External provider id for this intent (e.g. Stripe `pi_xxx`). */
  intentId: string;
  /** Client secret for browser-side confirmation (Stripe). */
  clientSecret?: string;
  /** Hosted checkout URL when the provider uses redirect flow (PayPal). */
  redirectUrl?: string;
  /** True when the intent has already settled — used by mock / offline providers. */
  immediateSuccess?: boolean;
}

export interface VerifyWebhookInput {
  /** Raw HTTP body bytes (Stripe needs them for signature verification). */
  rawBody: Buffer | string;
  /** Provider-specific signature header. */
  signature?: string;
}

export type WebhookEventKind =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_refunded'
  | 'unknown';

export interface WebhookEvent {
  /** Provider event id, used for idempotency. */
  id: string;
  kind: WebhookEventKind;
  intentId?: string;
  orderId?: string;
  amount?: Money;
  failureCode?: string;
  failureMessage?: string;
  /** Raw provider payload for debugging / audit. */
  raw?: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  /** Create a payment intent / authorisation. */
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  /** Validate a webhook payload and return a normalized event. */
  parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent>;
  /** Provider supports the given currency. */
  supports(currency: Currency): boolean;
}
