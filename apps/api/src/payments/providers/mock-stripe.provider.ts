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
 * Mock Stripe provider used when STRIPE_SECRET_KEY is missing. Generates
 * synthetic intent ids and treats every webhook payload as already-validated
 * JSON. Lets the API ship green in dev / CI without real Stripe credentials.
 */
@Injectable()
export class MockStripeProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'stripe';
  private readonly log = new Logger(MockStripeProvider.name);

  supports(_currency: Currency): boolean {
    return true;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const intentId = `pi_mock_${randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const clientSecret = `${intentId}_secret_${randomUUID().slice(0, 8)}`;
    this.log.warn(`mock Stripe intent created — order=${input.orderId} intent=${intentId}`);
    return { provider: 'stripe', intentId, clientSecret };
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8');
    const event = JSON.parse(body) as {
      id?: string;
      type?: string;
      data?: { object?: Record<string, unknown> };
    };
    const obj = event.data?.object ?? {};
    const meta = (obj.metadata as Record<string, string> | undefined) ?? {};
    const id = event.id ?? `evt_mock_${randomUUID()}`;

    if (event.type === 'payment_intent.succeeded') {
      const amountMinor = (obj.amount_received as number) ?? (obj.amount as number) ?? 0;
      const currency = ((obj.currency as string) ?? 'USD').toUpperCase() as Currency;
      return {
        id,
        kind: 'payment_succeeded',
        intentId: obj.id as string | undefined,
        orderId: meta.orderId,
        amount: { amountMinor, currency },
        raw: obj,
      };
    }
    if (event.type === 'payment_intent.payment_failed') {
      return {
        id,
        kind: 'payment_failed',
        intentId: obj.id as string | undefined,
        orderId: meta.orderId,
        failureMessage: 'mock failure',
        raw: obj,
      };
    }
    return { id, kind: 'unknown', intentId: obj.id as string | undefined, orderId: meta.orderId, raw: obj };
  }
}
