import { Module } from '@nestjs/common';

import { ProductsController } from './products.controller';
import { CatalogService } from './catalog.service';
import { AdminProductsModule } from '../admin-products/admin-products.module';

@Module({
  imports: [AdminProductsModule],
  controllers: [ProductsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class ProductsModule {}
