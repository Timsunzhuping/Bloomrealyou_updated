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
import { EasyPostWebhookController } from './easypost-webhook.controller';
import { EasyPostShippingProvider } from './providers/easypost-shipping.provider';
import { MockShippingProvider } from './providers/mock-shipping.provider';
import { SeventeentrackShippingProvider } from './providers/seventeentrack-shipping.provider';
import { ShippoShippingProvider } from './providers/shippo-shipping.provider';
import { ShippingSyncService } from './shipping-sync.service';
import { SHIPPING_PROVIDER } from './shipping.tokens';

const log = new Logger('AdminShippingModule');

/**
 * Resolve the active {@link ShippingProvider}:
 *
 *   SHIPPING_PROVIDER=mock                                → MockShippingProvider
 *   SHIPPING_PROVIDER=easypost  (or EASYPOST_API_KEY)     → EasyPostShippingProvider
 *   SHIPPING_PROVIDER=17track   (or SEVENTEENTRACK_API_KEY) → SeventeentrackShippingProvider
 *   SHIPPING_PROVIDER=shippo    (or SHIPPO_API_KEY)       → ShippoShippingProvider
 *
 * Any provider falls back to the mock when its API key is absent so a
 * misconfigured production env never blocks shipment edits.
 */
const shippingProviderFactory: Provider<ShippingProvider> = {
  provide: SHIPPING_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService): ShippingProvider => {
    const easypostKey = config.get<string>('EASYPOST_API_KEY');
    const seventeenKey = config.get<string>('SEVENTEENTRACK_API_KEY');
    const shippoKey = config.get<string>('SHIPPO_API_KEY');
    const explicit = config.get<string>('SHIPPING_PROVIDER');
    const provider =
      explicit ??
      (easypostKey ? 'easypost' : seventeenKey ? '17track' : shippoKey ? 'shippo' : 'mock');

    if (provider === 'easypost' && easypostKey) {
      log.log('shipping provider: easypost');
      return new EasyPostShippingProvider(
        easypostKey,
        config.get<string>('EASYPOST_BASE_URL') ?? 'https://api.easypost.com/v2',
      );
    }
    if (provider === '17track' && seventeenKey) {
      log.log('shipping provider: 17track');
      return new SeventeentrackShippingProvider(
        seventeenKey,
        config.get<string>('SEVENTEENTRACK_BASE_URL') ?? 'https://api.17track.net',
      );
    }
    if (provider === 'shippo' && shippoKey) {
      log.log('shipping provider: shippo');
      return new ShippoShippingProvider(
        shippoKey,
        config.get<string>('SHIPPO_BASE_URL') ?? 'https://api.goshippo.com',
      );
    }
    if (provider !== 'mock') {
      log.warn(`SHIPPING_PROVIDER=${provider} but its API key is missing — using mock`);
    } else {
      log.log('shipping provider: mock');
    }
    return new MockShippingProvider();
  },
};

@Module({
  imports: [ConfigModule, AdminAuthModule, AdminProductionModule, OrdersModule],
  controllers: [AdminShipmentsController, CustomerTrackingController, EasyPostWebhookController],
  providers: [
    AdminShipmentsRepository,
    AdminShipmentsService,
    ShippingSyncService,
    shippingProviderFactory,
  ],
  exports: [AdminShipmentsService, AdminShipmentsRepository, ShippingSyncService, SHIPPING_PROVIDER],
})
export class AdminShippingModule {}
