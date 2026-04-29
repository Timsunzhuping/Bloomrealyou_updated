import { Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import type { ShippingProvider } from '@custom-merch/shared';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminProductionModule } from '../admin-production/admin-production.module';
import { OrdersModule } from '../orders/orders.module';

import {
  AdminShipmentsController,
  CustomerTrackingController,
} from './admin-shipments.controller';
import { AdminShipmentsRepository } from './admin-shipments.repository';
import { AdminShipmentsService } from './admin-shipments.service';
import { EasyPostShippingProvider } from './providers/easypost-shipping.provider';
import { MockShippingProvider } from './providers/mock-shipping.provider';
import { ShippingSyncService } from './shipping-sync.service';
import { SHIPPING_PROVIDER } from './shipping.tokens';

const log = new Logger('AdminShippingModule');

/**
 * Resolve the active {@link ShippingProvider}:
 *
 *   SHIPPING_PROVIDER=mock                          → MockShippingProvider
 *   SHIPPING_PROVIDER=easypost (or EASYPOST_API_KEY) → EasyPostShippingProvider
 *
 * EasyPost gracefully falls back to mock if the EASYPOST_API_KEY env var is
 * missing, so a misconfigured prod env never blocks shipment edits.
 */
const shippingProviderFactory: Provider<ShippingProvider> = {
  provide: SHIPPING_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): ShippingProvider => {
    const apiKey = config.get<string>('EASYPOST_API_KEY');
    const explicit = config.get<string>('SHIPPING_PROVIDER');
    const provider = explicit ?? (apiKey ? 'easypost' : 'mock');

    if (provider === 'easypost' && apiKey) {
      log.log('shipping provider: easypost');
      return new EasyPostShippingProvider(
        apiKey,
        config.get<string>('EASYPOST_BASE_URL') ?? 'https://api.easypost.com/v2',
      );
    }
    if (provider === 'easypost' && !apiKey) {
      log.warn('SHIPPING_PROVIDER=easypost but EASYPOST_API_KEY is missing — using mock');
    } else {
      log.log('shipping provider: mock');
    }
    return new MockShippingProvider();
  },
};

@Module({
  imports: [ConfigModule, AdminAuthModule, AdminProductionModule, OrdersModule],
  controllers: [AdminShipmentsController, CustomerTrackingController],
  providers: [
    AdminShipmentsRepository,
    AdminShipmentsService,
    ShippingSyncService,
    shippingProviderFactory,
  ],
  exports: [AdminShipmentsService, AdminShipmentsRepository, ShippingSyncService, SHIPPING_PROVIDER],
})
export class AdminShippingModule {}
