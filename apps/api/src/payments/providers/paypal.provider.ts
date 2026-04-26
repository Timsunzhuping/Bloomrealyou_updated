import { Injectable, Logger } from '@nestjs/common';
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
 * PayPal placeholder. Will be replaced by the @paypal/checkout-server-sdk
 * integration in a follow-up. Today it surfaces a redirect URL that the
 * front-end can short-circuit to /checkout/success in mock mode.
 */
@Injectable()
export class PaypalProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'paypal';
  private readonly log = new Logger(PaypalProvider.name);

  supports(_currency: Currency): boolean {
    return true;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const intentId = `paypal_mock_${randomUUID().slice(0, 16)}`;
    this.log.warn(`mock PayPal intent — order=${input.orderId} intent=${intentId}`);
    return {
      provider: 'paypal',
      intentId,
      redirectUrl: `https://example.invalid/paypal/${intentId}`,
    };
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8');
    const event = JSON.parse(body) as {
      id?: string;
      event_type?: string;
      resource?: Record<string, unknown>;
    };
    const id = event.id ?? `paypal_evt_${randomUUID()}`;
    const meta = (event.resource?.custom_id as string | undefined)?.split(':') ?? [];
    const orderId = meta[1];
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      return { id, kind: 'payment_succeeded', orderId, raw: event.resource };
    }
    if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      return { id, kind: 'payment_failed', orderId, raw: event.resource };
    }
    return { id, kind: 'unknown', orderId, raw: event.resource };
  }
}
