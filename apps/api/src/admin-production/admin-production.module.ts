import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminSuppliersModule } from '../admin-suppliers/admin-suppliers.module';
import { OrdersModule } from '../orders/orders.module';
import { StorageModule } from '../storage/storage.module';

import { AdminProductionController } from './admin-production.controller';
import { AdminProductionRepository } from './admin-production.repository';
import { AdminProductionService } from './admin-production.service';
import { SupplierPortalController } from './supplier-portal.controller';

@Module({
  imports: [AdminAuthModule, AdminSuppliersModule, OrdersModule, StorageModule],
  controllers: [AdminProductionController, SupplierPortalController],
  providers: [AdminProductionRepository, AdminProductionService],
  exports: [AdminProductionRepository, AdminProductionService],
})
export class AdminProductionModule {}
