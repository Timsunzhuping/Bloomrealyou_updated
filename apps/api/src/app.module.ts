import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { ApiRateLimiterGuard } from './_lib/api-rate-limiter.guard';
import { PlatformInfraModule } from './_lib/platform-infra.module';
import { AccountModule } from './account/account.module';
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { AdminDesignReviewsModule } from './admin-design-reviews/admin-design-reviews.module';
import { AdminOrdersModule } from './admin-orders/admin-orders.module';
import { AdminProductionModule } from './admin-production/admin-production.module';
import { AdminProductsModule } from './admin-products/admin-products.module';
import { AdminShippingModule } from './admin-shipments/admin-shipments.module';
import { AdminSuppliersModule } from './admin-suppliers/admin-suppliers.module';
import { AdminTemplatesModule } from './admin-templates/admin-templates.module';
import { AIModule } from './ai/ai.module';
import { AiAgentsModule } from './ai-agents/ai-agents.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';
import { CartModule } from './cart/cart.module';
import { NotificationsModule } from './notifications/notifications.module';
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
    PlatformInfraModule,
    AuditLogsModule,
    NotificationsModule,
    HealthModule,
    ProductsModule,
    CustomizationsModule,
    PricingModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    AccountModule,
    AIModule,
    AiAgentsModule,
    RFQsModule,
    QuotesModule,
    AdminAuthModule,
    AdminDashboardModule,
    AdminProductsModule,
    AdminTemplatesModule,
    AdminOrdersModule,
    AdminDesignReviewsModule,
    AdminSuppliersModule,
    AdminProductionModule,
    AdminShippingModule,
  ],
  providers: [
    // Front-of-the-pipeline per-IP token bucket. Tunable via env; webhook
    // controllers stack their own stricter guard on top.
    { provide: APP_GUARD, useClass: ApiRateLimiterGuard },
  ],
})
export class AppModule {}
