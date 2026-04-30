import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  Currency,
  CreateIntentInput,
  CreateIntentResult,
  PaymentProvider,
  PaymentProviderName,
  VerifyWebhookInput,
  WebhookEvent,
} from '@custom-merch/shared';

/**
 * Offline payment used for B2B / RFQ orders. The "intent" is just a marker —
 * the order moves to `pending_payment` and the finance team marks it paid
 * when the wire transfer clears.
 */
@Injectable()
export class ManualInvoiceProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'manual_invoice';

  supports(_currency: Currency): boolean {
    return true;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    return {
      provider: 'manual_invoice',
      intentId: `inv_${input.orderNumber}_${randomUUID().slice(0, 8)}`,
    };
  }

  async parseWebhook(_input: VerifyWebhookInput): Promise<WebhookEvent> {
    return { id: `inv_evt_${randomUUID()}`, kind: 'unknown' };
  }
}
