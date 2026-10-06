import { Module } from '@nestjs/common';

import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminProductsModule } from '../admin-products/admin-products.module';
import { StorageModule } from '../storage/storage.module';

import { ListingAIService } from './listing-ai.service';
import { ProductListingController } from './product-listing.controller';
import { ProductListingService } from './product-listing.service';

@Module({
  imports: [AdminAuthModule, AdminProductsModule, StorageModule],
  controllers: [ProductListingController],
  providers: [ProductListingService, ListingAIService],
})
export class ProductListingModule {}
