import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import type {
  CapturePaypalOrderResult,
  CreatePaymentIntentResult,
  PaymentDto,
} from '@custom-merch/shared';

import { CapturePaypalOrderBody, CreatePaymentIntentBody } from './payments.dto';
import { PaymentsService } from './payments.service';

interface RawRequest extends Request {
  rawBody?: Buffer;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentsService) {}

  /** POST /payments/create-intent */
  @Post('create-intent')
  createIntent(@Body() body: CreatePaymentIntentBody): Promise<CreatePaymentIntentResult> {
    return this.service.createIntent({ orderId: body.orderId, provider: body.provider });
  }

  /** POST /payments/paypal/capture */
  @Post('paypal/capture')
  capturePaypalOrder(@Body() body: CapturePaypalOrderBody): Promise<CapturePaypalOrderResult> {
    return this.service.capturePaypalOrder({ paypalOrderId: body.paypalOrderId });
  }

  /** GET /payments/:id */
  @Get(':id')
  get(@Param('id') id: string): PaymentDto {
    return this.service.get(id);
  }

  /** POST /payments/webhook/stripe */
  @Post('webhook/stripe')
  @HttpCode(200)
  stripeWebhook(
    @Req() req: RawRequest,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    return this.service.handleStripeWebhook(raw, signature);
  }

  /** POST /payments/webhook/paypal */
  @Post('webhook/paypal')
  @HttpCode(200)
  paypalWebhook(
    @Req() req: RawRequest,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ received: true }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    return this.service.handlePaypalWebhook(raw, headerValue(headers['paypal-transmission-sig']), {
      'paypal-auth-algo': headerValue(headers['paypal-auth-algo']),
      'paypal-cert-url': headerValue(headers['paypal-cert-url']),
      'paypal-transmission-id': headerValue(headers['paypal-transmission-id']),
      'paypal-transmission-sig': headerValue(headers['paypal-transmission-sig']),
      'paypal-transmission-time': headerValue(headers['paypal-transmission-time']),
    });
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
