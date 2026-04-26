import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';

import {
  AdminMappingsController,
  AdminSuppliersController,
} from './admin-suppliers.controller';
import { AdminSuppliersRepository } from './admin-suppliers.repository';
import { AdminSuppliersService } from './admin-suppliers.service';
import { SupplierRoutingService } from './supplier-routing.service';

@Module({
  imports: [AdminAuthModule],
  controllers: [AdminSuppliersController, AdminMappingsController],
  providers: [AdminSuppliersRepository, AdminSuppliersService, SupplierRoutingService],
  exports: [AdminSuppliersRepository, AdminSuppliersService, SupplierRoutingService],
})
export class AdminSuppliersModule {}
