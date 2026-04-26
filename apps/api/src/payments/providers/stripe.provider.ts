import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  Currency,
  CreateIntentInput,
  CreateIntentResult,
  PaymentProvider,
  PaymentProviderName,
  VerifyWebhookInput,
  WebhookEvent,
} from '@custom-merch/shared';

interface StripeProviderOptions {
  secretKey: string;
  webhookSecret?: string;
}

/**
 * Real Stripe adapter built on top of the official `stripe` SDK.
 * Falls back to mock mode when no secret key is configured (see
 * MockStripeProvider in payments.module.ts).
 */
@Injectable()
export class StripeProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'stripe';
  private readonly log = new Logger(StripeProvider.name);
  private readonly stripe: Stripe;

  constructor(private readonly options: StripeProviderOptions) {
    this.stripe = new Stripe(options.secretKey);
  }

  supports(_currency: Currency): boolean {
    return true;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const intent = await this.stripe.paymentIntents.create({
      amount: input.amount.amountMinor,
      currency: input.amount.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      receipt_email: input.customerEmail,
      metadata: {
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        ...(input.metadata ?? {}),
      },
    });
    return {
      provider: 'stripe',
      intentId: intent.id,
      clientSecret: intent.client_secret ?? undefined,
    };
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    let event: Stripe.Event;
    if (this.options.webhookSecret && input.signature) {
      event = this.stripe.webhooks.constructEvent(
        input.rawBody,
        input.signature,
        this.options.webhookSecret,
      );
    } else {
      this.log.warn('STRIPE_WEBHOOK_SECRET missing — accepting event without signature');
      const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8');
      event = JSON.parse(body) as Stripe.Event;
    }
    return mapStripeEvent(event);
  }
}

function mapStripeEvent(event: Stripe.Event): WebhookEvent {
  const obj = event.data.object as unknown as Record<string, unknown>;
  const meta = (obj.metadata as Record<string, string> | undefined) ?? {};
  const intentId = (obj.id as string | undefined) ?? undefined;
  const orderId = meta.orderId;

  if (event.type === 'payment_intent.succeeded') {
    const amountMinor = (obj.amount_received as number) ?? (obj.amount as number) ?? 0;
    const currency = ((obj.currency as string) ?? 'usd').toUpperCase();
    return {
      id: event.id,
      kind: 'payment_succeeded',
      intentId,
      orderId,
      amount: { amountMinor, currency: currency as Currency },
      raw: obj,
    };
  }
  if (event.type === 'payment_intent.payment_failed') {
    const lastError = obj.last_payment_error as Record<string, unknown> | undefined;
    return {
      id: event.id,
      kind: 'payment_failed',
      intentId,
      orderId,
      failureCode: lastError?.code as string | undefined,
      failureMessage: lastError?.message as string | undefined,
      raw: obj,
    };
  }
  if (event.type === 'charge.refunded') {
    return { id: event.id, kind: 'payment_refunded', intentId, orderId, raw: obj };
  }
  return { id: event.id, kind: 'unknown', intentId, orderId, raw: obj };
}
