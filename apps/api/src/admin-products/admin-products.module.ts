import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { StorageModule } from '../storage/storage.module';

import {
  AdminProductChildrenController,
  AdminProductsController,
} from './admin-products.controller';
import { AdminProductsRepository } from './admin-products.repository';
import { AdminProductsService } from './admin-products.service';

@Module({
  imports: [AdminAuthModule, StorageModule],
  controllers: [AdminProductsController, AdminProductChildrenController],
  providers: [AdminProductsRepository, AdminProductsService],
  exports: [AdminProductsRepository],
})
export class AdminProductsModule {}
