import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountModule } from './account/account.module';
import { CartModule } from './cart/cart.module';
import { CustomizationsModule } from './customizations/customizations.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    HealthModule,
    ProductsModule,
    CustomizationsModule,
    PricingModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AccountModule,
  ],
})
export class AppModule {}
