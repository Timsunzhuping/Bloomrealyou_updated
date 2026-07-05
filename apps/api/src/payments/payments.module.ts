import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { PaymentProvider, PaymentProviderName } from '@custom-merch/shared';

import { OrdersModule } from '../orders/orders.module';

import { ManualInvoiceProvider } from './providers/manual-invoice.provider';
import { MockStripeProvider } from './providers/mock-stripe.provider';
import { PaypalProvider } from './providers/paypal.provider';
import { StripeProvider } from './providers/stripe.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PAYMENT_PROVIDERS } from './payments.tokens';

const log = new Logger('PaymentsModule');

const providersFactory: Provider<Record<PaymentProviderName, PaymentProvider>> = {
  provide: PAYMENT_PROVIDERS,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Record<PaymentProviderName, PaymentProvider> => {
    const stripeKey = config.get<string>('STRIPE_SECRET_KEY');
    const stripe: PaymentProvider = stripeKey
      ? new StripeProvider({ secretKey: stripeKey, webhookSecret: config.get<string>('STRIPE_WEBHOOK_SECRET') })
      : ((): PaymentProvider => {
          log.warn('STRIPE_SECRET_KEY missing — using mock Stripe provider');
          return new MockStripeProvider();
        })();
    const paypal = new PaypalProvider({
      clientId: config.get<string>('PAYPAL_CLIENT_ID'),
      clientSecret: config.get<string>('PAYPAL_CLIENT_SECRET'),
      environment: config.get<string>('PAYPAL_ENV') === 'live' ? 'live' : 'sandbox',
      webhookId: config.get<string>('PAYPAL_WEBHOOK_ID'),
      requireWebhookSignature: config.get<string>('PAYPAL_WEBHOOK_REQUIRE_SIGNATURE') === 'true',
      appUrl: config.get<string>('APP_URL') ?? config.get<string>('WEB_URL'),
    });
    const manualInvoice = new ManualInvoiceProvider();
    return { stripe, paypal, manual_invoice: manualInvoice };
  },
};

@Module({
  imports: [ConfigModule, OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsRepository, PaymentsService, providersFactory],
  exports: [PaymentsService],
})
export class PaymentsModule {}
