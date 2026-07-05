import type { PaymentProviderName } from '../contracts/payment-provider';
import type { PaymentStatus } from '../constants/statuses';

import type { Money } from './common';

export interface PaymentDto {
  id: string;
  orderId: string;
  provider: PaymentProviderName;
  /** Provider intent id (e.g. Stripe pi_*). */
  providerReference: string;
  status: PaymentStatus;
  amount: Money;
  refundedAmount?: Money;
  failureCode?: string | null;
  failureMessage?: string | null;
  authorizedAt?: string | null;
  capturedAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentIntentInput {
  orderId: string;
  provider?: PaymentProviderName;
}

export interface CreatePaymentIntentResult {
  paymentId: string;
  provider: PaymentProviderName;
  intentId: string;
  clientSecret?: string;
  redirectUrl?: string;
  immediateSuccess?: boolean;
}

export interface CapturePaypalOrderInput {
  paypalOrderId: string;
}

export interface CapturePaypalOrderResult {
  received: true;
  payment: PaymentDto;
}
