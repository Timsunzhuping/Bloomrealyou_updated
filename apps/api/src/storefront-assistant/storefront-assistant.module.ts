import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { ModelConfigurationModule } from '../model-config/model-config.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';

import { StorefrontAssistantController } from './storefront-assistant.controller';
import { StorefrontAssistantService } from './storefront-assistant.service';

@Module({
  imports: [CartModule, OrdersModule, ProductsModule, ModelConfigurationModule],
  controllers: [StorefrontAssistantController],
  providers: [StorefrontAssistantService],
})
export class StorefrontAssistantModule {}
