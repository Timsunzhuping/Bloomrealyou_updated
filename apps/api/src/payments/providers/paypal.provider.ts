import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  CaptureIntentInput,
  Currency,
  CreateIntentInput,
  CreateIntentResult,
  PaymentProvider,
  PaymentProviderName,
  VerifyWebhookInput,
  WebhookEvent,
} from '@custom-merch/shared';

interface PaypalProviderOptions {
  clientId?: string;
  clientSecret?: string;
  environment?: 'sandbox' | 'live';
  webhookId?: string;
  requireWebhookSignature?: boolean;
  appUrl?: string;
}

interface PaypalOrderResponse {
  id: string;
  status?: string;
  purchase_units?: Array<{
    custom_id?: string;
    reference_id?: string;
    payments?: {
      captures?: Array<{
        id?: string;
        status?: string;
        amount?: { value?: string; currency_code?: string };
      }>;
    };
  }>;
  links?: Array<{ href: string; rel: string }>;
}

interface PaypalWebhookPayload {
  id?: string;
  event_type?: string;
  resource?: Record<string, unknown>;
}

@Injectable()
export class PaypalProvider implements PaymentProvider {
  readonly name: PaymentProviderName = 'paypal';
  private readonly log = new Logger(PaypalProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly options: PaypalProviderOptions = {}) {
    this.baseUrl =
      options.environment === 'live'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';
  }

  supports(_currency: Currency): boolean {
    return true;
  }

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    if (!this.isConfigured()) {
      return this.createMockIntent(input);
    }

    const accessToken = await this.getAccessToken();
    const amountValue = formatPayPalAmount(input.amount.amountMinor);
    const returnBase = trimTrailingSlash(this.options.appUrl ?? 'http://localhost:3000');
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `order-${input.orderId}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: input.orderId,
            custom_id: `order:${input.orderId}`,
            invoice_id: input.orderNumber,
            description: `Bloomrealyou order ${input.orderNumber}`,
            amount: {
              currency_code: input.amount.currency,
              value: amountValue,
            },
          },
        ],
        application_context: {
          brand_name: 'Bloomrealyou',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${returnBase}/checkout/success?orderNumber=${encodeURIComponent(input.orderNumber)}`,
          cancel_url: `${returnBase}/checkout/cancelled?orderNumber=${encodeURIComponent(input.orderNumber)}`,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`PayPal create order failed (${res.status}): ${await safeText(res)}`);
    }

    const order = (await res.json()) as PaypalOrderResponse;
    const approveUrl = order.links?.find((link) => link.rel === 'approve')?.href;
    if (!order.id || !approveUrl) {
      throw new Error('PayPal create order response did not include an approval URL');
    }

    return {
      provider: 'paypal',
      intentId: order.id,
      redirectUrl: approveUrl,
    };
  }

  async captureIntent(input: CaptureIntentInput): Promise<WebhookEvent> {
    if (!this.isConfigured()) {
      return {
        id: `paypal_mock_capture_${input.intentId}`,
        kind: 'payment_succeeded',
        intentId: input.intentId,
      };
    }

    const accessToken = await this.getAccessToken();
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${encodeURIComponent(input.intentId)}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `capture-${input.intentId}`,
      },
    });
    if (!res.ok) {
      throw new Error(`PayPal capture failed (${res.status}): ${await safeText(res)}`);
    }

    const order = (await res.json()) as PaypalOrderResponse;
    const unit = order.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const captureStatus = capture?.status ?? order.status;
    const orderId = extractPlatformOrderId(unit?.custom_id, unit?.reference_id);

    if (captureStatus === 'COMPLETED') {
      return {
        id: `paypal_capture_${capture?.id ?? order.id ?? input.intentId}`,
        kind: 'payment_succeeded',
        intentId: order.id ?? input.intentId,
        orderId,
        amount: extractAmount(capture ?? {}),
        raw: order as unknown as Record<string, unknown>,
      };
    }

    return {
      id: `paypal_capture_${capture?.id ?? order.id ?? input.intentId}`,
      kind: 'payment_failed',
      intentId: order.id ?? input.intentId,
      orderId,
      failureCode: captureStatus,
      failureMessage: `PayPal capture status: ${captureStatus ?? 'unknown'}`,
      raw: order as unknown as Record<string, unknown>,
    };
  }

  private createMockIntent(input: CreateIntentInput): CreateIntentResult {
    const intentId = `paypal_mock_${randomUUID().slice(0, 16)}`;
    this.log.warn(`mock PayPal intent — order=${input.orderId} intent=${intentId}`);
    return {
      provider: 'paypal',
      intentId,
      redirectUrl: `https://example.invalid/paypal/${intentId}`,
    };
  }

  async parseWebhook(input: VerifyWebhookInput): Promise<WebhookEvent> {
    await this.verifyWebhook(input);

    const body = typeof input.rawBody === 'string' ? input.rawBody : input.rawBody.toString('utf8');
    const event = JSON.parse(body) as PaypalWebhookPayload;
    const id = event.id ?? `paypal_evt_${randomUUID()}`;
    const resource = event.resource ?? {};
    const orderId = extractOrderId(resource);
    const intentId = extractPayPalOrderId(resource);

    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      return {
        id,
        kind: 'payment_succeeded',
        intentId,
        orderId,
        amount: extractAmount(resource),
        raw: resource,
      };
    }
    if (event.event_type === 'PAYMENT.CAPTURE.DENIED') {
      return { id, kind: 'payment_failed', intentId, orderId, raw: resource };
    }
    if (event.event_type === 'PAYMENT.CAPTURE.REFUNDED') {
      return { id, kind: 'payment_refunded', intentId, orderId, amount: extractAmount(resource), raw: resource };
    }
    return { id, kind: 'unknown', intentId, orderId, raw: resource };
  }

  private isConfigured(): boolean {
    return Boolean(this.options.clientId && this.options.clientSecret);
  }

  private async getAccessToken(): Promise<string> {
    if (!this.options.clientId || !this.options.clientSecret) {
      throw new Error('PayPal credentials are not configured');
    }

    const token = Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString('base64');
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    if (!res.ok) {
      throw new Error(`PayPal OAuth failed (${res.status}): ${await safeText(res)}`);
    }
    const body = (await res.json()) as { access_token?: string };
    if (!body.access_token) throw new Error('PayPal OAuth response did not include access_token');
    return body.access_token;
  }

  private async verifyWebhook(input: VerifyWebhookInput): Promise<void> {
    const shouldVerify =
      Boolean(this.options.webhookId && this.isConfigured()) ||
      this.options.requireWebhookSignature ||
      process.env.NODE_ENV === 'production';
    if (!shouldVerify) return;

    if (!this.options.webhookId || !this.isConfigured()) {
      throw new Error('PayPal webhook signature verification requires PAYPAL_WEBHOOK_ID and credentials');
    }

    const headers = input.headers ?? {};
    const accessToken = await this.getAccessToken();
    const body =
      typeof input.rawBody === 'string' ? JSON.parse(input.rawBody) : JSON.parse(input.rawBody.toString('utf8'));
    const res = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: input.signature ?? headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: this.options.webhookId,
        webhook_event: body,
      }),
    });

    if (!res.ok) {
      throw new Error(`PayPal webhook verification failed (${res.status}): ${await safeText(res)}`);
    }
    const result = (await res.json()) as { verification_status?: string };
    if (result.verification_status !== 'SUCCESS') {
      throw new Error(`PayPal webhook signature rejected: ${result.verification_status ?? 'unknown'}`);
    }
  }
}

function formatPayPalAmount(amountMinor: number): string {
  return (amountMinor / 100).toFixed(2);
}

function trimTrailingSlash(value: string): string {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

async function safeText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

function extractOrderId(resource: Record<string, unknown>): string | undefined {
  const customId = resource.custom_id as string | undefined;
  const referenceId = resource.reference_id as string | undefined;
  return extractPlatformOrderId(customId, referenceId);
}

function extractPlatformOrderId(customId?: string, referenceId?: string): string | undefined {
  if (customId?.startsWith('order:')) return customId.slice('order:'.length);
  return referenceId;
}

function extractPayPalOrderId(resource: Record<string, unknown>): string | undefined {
  const supplementary = resource.supplementary_data as Record<string, unknown> | undefined;
  const related = supplementary?.related_ids as Record<string, unknown> | undefined;
  return (related?.order_id as string | undefined) ?? (resource.id as string | undefined);
}

function extractAmount(resource: Record<string, unknown>): { amountMinor: number; currency: Currency } | undefined {
  const amount = resource.amount as Record<string, unknown> | undefined;
  const rawValue = amount?.value as string | undefined;
  const rawCurrency = amount?.currency_code as string | undefined;
  if (!rawValue || !rawCurrency) return undefined;
  return {
    amountMinor: Math.round(Number(rawValue) * 100),
    currency: rawCurrency as Currency,
  };
}
