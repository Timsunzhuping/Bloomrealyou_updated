import type {
  CreatePaymentIntentInput,
  CreatePaymentIntentResult,
  PaymentDto,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class PaymentsClient {
  constructor(private readonly api: ApiClient) {}

  async createIntent(input: CreatePaymentIntentInput): Promise<CreatePaymentIntentResult> {
    return this.api.request<CreatePaymentIntentResult>('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<PaymentDto> {
    return this.api.request<PaymentDto>(`/payments/${encodeURIComponent(id)}`);
  }
}
