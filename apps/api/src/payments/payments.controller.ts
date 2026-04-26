import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import type { CreatePaymentIntentResult, PaymentDto } from '@custom-merch/shared';

import { CreatePaymentIntentBody } from './payments.dto';
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
    @Headers('paypal-transmission-sig') signature: string | undefined,
  ): Promise<{ received: true }> {
    const raw = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
    return this.service.handlePaypalWebhook(raw, signature);
  }
}
