import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  CreatePaymentIntentResult,
  PaymentDto,
  PaymentProvider,
  PaymentProviderName,
  WebhookEvent,
} from '@custom-merch/shared';

import { OrderProgressService } from '../notifications/order-progress.service';
import { OrdersService } from '../orders/orders.service';

import { PaymentsRepository } from './payments.repository';
import { PAYMENT_PROVIDERS } from './payments.tokens';

@Injectable()
export class PaymentsService {
  private readonly log = new Logger(PaymentsService.name);

  constructor(
    @Inject(PAYMENT_PROVIDERS)
    private readonly providers: Record<PaymentProviderName, PaymentProvider>,
    private readonly repo: PaymentsRepository,
    private readonly orders: OrdersService,
    private readonly progress: OrderProgressService,
  ) {}

  async createIntent(input: { orderId: string; provider?: PaymentProviderName }): Promise<CreatePaymentIntentResult> {
    const order = this.orders.get(input.orderId);
    const providerName: PaymentProviderName = input.provider ?? 'stripe';
    const provider = this.providers[providerName];
    if (!provider) throw new BadRequestException(`Unknown payment provider: ${providerName}`);

    const intent = await provider.createIntent({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: order.total,
      customerEmail: order.customerEmail ?? undefined,
      metadata: { orderId: order.id, orderNumber: order.orderNumber },
    });

    const now = new Date().toISOString();
    const payment: PaymentDto = {
      id: randomUUID(),
      orderId: order.id,
      provider: providerName,
      providerReference: intent.intentId,
      status: 'pending',
      amount: order.total,
      authorizedAt: null,
      capturedAt: null,
      failedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.repo.save(payment);

    return {
      paymentId: payment.id,
      provider: providerName,
      intentId: intent.intentId,
      clientSecret: intent.clientSecret,
      redirectUrl: intent.redirectUrl,
      immediateSuccess: intent.immediateSuccess,
    };
  }

  /** Process a Stripe webhook payload. */
  async handleStripeWebhook(rawBody: Buffer, signature?: string): Promise<{ received: true }> {
    const provider = this.providers.stripe;
    const event = await provider.parseWebhook({ rawBody, signature });
    await this.applyEvent('stripe', event);
    return { received: true };
  }

  /** Process a PayPal webhook payload. */
  async handlePaypalWebhook(rawBody: Buffer, signature?: string): Promise<{ received: true }> {
    const provider = this.providers.paypal;
    const event = await provider.parseWebhook({ rawBody, signature });
    await this.applyEvent('paypal', event);
    return { received: true };
  }

  private async applyEvent(_providerName: PaymentProviderName, event: WebhookEvent): Promise<void> {
    if (!this.repo.markEventProcessed(event.id)) {
      this.log.log(`webhook event ${event.id} already processed — skipping`);
      return;
    }

    const payment = event.intentId
      ? this.repo.findByProviderReference(event.intentId)
      : undefined;
    if (!payment) {
      this.log.warn(`webhook event ${event.id} matched no payment intent`);
      return;
    }

    if (event.kind === 'payment_succeeded') {
      this.repo.save({
        ...payment,
        status: 'succeeded',
        capturedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.orders.setStatus(payment.orderId, 'paid');
      // Customised orders move straight into design review.
      const order = this.orders.get(payment.orderId);
      if (order.items.some((i) => i.customizationId)) {
        this.orders.setStatus(payment.orderId, 'design_review');
      }
      this.progress.notify(payment.orderId, 'payment_succeeded', {
        extra: {
          totalFormatted: `${payment.amount.currency} ${(payment.amount.amountMinor / 100).toFixed(2)}`,
        },
      });
    } else if (event.kind === 'payment_failed') {
      this.repo.save({
        ...payment,
        status: 'failed',
        failureCode: event.failureCode ?? null,
        failureMessage: event.failureMessage ?? null,
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else if (event.kind === 'payment_refunded') {
      this.repo.save({
        ...payment,
        status: 'refunded',
        updatedAt: new Date().toISOString(),
      });
      this.orders.setStatus(payment.orderId, 'refunded');
    }
  }

  get(id: string): PaymentDto {
    const p = this.repo.get(id);
    if (!p) throw new NotFoundException(`Payment not found: ${id}`);
    return p;
  }

  listForOrder(orderId: string): PaymentDto[] {
    return this.repo.listForOrder(orderId);
  }
}
