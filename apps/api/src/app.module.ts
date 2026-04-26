import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CustomizationsModule } from './customizations/customizations.module';
import { HealthModule } from './health/health.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    HealthModule,
    ProductsModule,
    CustomizationsModule,
  ],
})
export class AppModule {}
