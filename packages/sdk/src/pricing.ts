import type { PricingInput, PricingResult } from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class PricingClient {
  constructor(private readonly api: ApiClient) {}

  async calculate(input: PricingInput): Promise<PricingResult> {
    return this.api.request<PricingResult>('/pricing/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
