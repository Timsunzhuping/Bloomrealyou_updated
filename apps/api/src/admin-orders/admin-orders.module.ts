import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { OrdersModule } from '../orders/orders.module';

import { AdminOrdersController } from './admin-orders.controller';
import { AdminOrdersExtrasRepository } from './admin-orders.repository';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [AdminAuthModule, OrdersModule],
  controllers: [AdminOrdersController],
  providers: [AdminOrdersExtrasRepository, AdminOrdersService],
  exports: [AdminOrdersService],
})
export class AdminOrdersModule {}
