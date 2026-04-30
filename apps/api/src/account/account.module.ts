import { Module } from '@nestjs/common';

import { CartModule } from '../cart/cart.module';
import { CustomizationsModule } from '../customizations/customizations.module';
import { OrdersModule } from '../orders/orders.module';

import { AccountController } from './account.controller';
import { AccountRepository } from './account.repository';
import { AccountService } from './account.service';

@Module({
  imports: [OrdersModule, CustomizationsModule, CartModule],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
  exports: [AccountService],
})
export class AccountModule {}
