import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CartModule } from './cart/cart.module';
import { CustomizationsModule } from './customizations/customizations.module';
import { HealthModule } from './health/health.module';
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
  ],
})
export class AppModule {}
