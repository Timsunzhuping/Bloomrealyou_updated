import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { CustomizationsModule } from '../customizations/customizations.module';
import { PricingModule } from '../pricing/pricing.module';

import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';

@Module({
  imports: [CartModule, CustomizationsModule, PricingModule],
  controllers: [OrdersController],
  providers: [OrdersRepository, OrdersService],
  exports: [OrdersService, OrdersRepository],
})
export class OrdersModule {}
