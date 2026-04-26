import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminProductionModule } from '../admin-production/admin-production.module';
import { OrdersModule } from '../orders/orders.module';

import {
  AdminShipmentsController,
  CustomerTrackingController,
} from './admin-shipments.controller';
import { AdminShipmentsRepository } from './admin-shipments.repository';
import { AdminShipmentsService } from './admin-shipments.service';

@Module({
  imports: [AdminAuthModule, AdminProductionModule, OrdersModule],
  controllers: [AdminShipmentsController, CustomerTrackingController],
  providers: [AdminShipmentsRepository, AdminShipmentsService],
  exports: [AdminShipmentsService, AdminShipmentsRepository],
})
export class AdminShippingModule {}
