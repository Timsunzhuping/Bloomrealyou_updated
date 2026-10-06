import { Module } from '@nestjs/common';

import { PricingModule } from '../pricing/pricing.module';
import { ProductsModule } from '../products/products.module';

import { CartController } from './cart.controller';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

@Module({
  imports: [PricingModule, ProductsModule],
  controllers: [CartController],
  providers: [CartRepository, CartService],
  exports: [CartService, CartRepository],
})
export class CartModule {}
