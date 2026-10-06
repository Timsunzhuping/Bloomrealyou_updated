import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import {
  type Product,
  type ProductPriceTier,
  type ProductPrintArea,
  type ProductVariant,
} from '@custom-merch/shared';
import { CatalogService } from './catalog.service';

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

@Controller('products')
export class ProductsController {
  constructor(private readonly catalog: CatalogService) {}
  /** GET /products?category=t-shirts&page=1&pageSize=24 */
  @Get()
  list(
    @Query('category') category?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '24',
  ): ProductListResponse {
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(60, Math.max(1, Number(pageSize) || 24));
    return this.catalog.list(category, p, ps);
  }

  /** GET /products/:slug */
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Product {
    const bundle = this.catalog.find(slug);
    if (!bundle) throw new NotFoundException(`Product not found: ${slug}`);
    return bundle.product;
  }

  /** GET /products/by-id/:id/variants */
  @Get('by-id/:id/variants')
  variants(@Param('id') id: string): ProductVariant[] {
    const bundle = this.catalog.find(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.variants;
  }

  /** GET /products/by-id/:id/print-areas */
  @Get('by-id/:id/print-areas')
  printAreas(@Param('id') id: string): ProductPrintArea[] {
    const bundle = this.catalog.find(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.printAreas;
  }

  /** GET /products/by-id/:id/price-tiers */
  @Get('by-id/:id/price-tiers')
  priceTiers(@Param('id') id: string): ProductPriceTier[] {
    const bundle = this.catalog.find(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.priceTiers;
  }
}
