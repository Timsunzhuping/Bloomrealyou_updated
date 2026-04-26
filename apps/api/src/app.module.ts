import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AccountModule } from './account/account.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AIModule } from './ai/ai.module';
import { CartModule } from './cart/cart.module';
import { CustomizationsModule } from './customizations/customizations.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { PricingModule } from './pricing/pricing.module';
import { ProductsModule } from './products/products.module';
import { QuotesModule } from './quotes/quotes.module';
import { RFQsModule } from './rfqs/rfqs.module';

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
    AIModule,
    RFQsModule,
    QuotesModule,
    AdminAuthModule,
    AdminDashboardModule,
  ],
})
export class AppModule {}
