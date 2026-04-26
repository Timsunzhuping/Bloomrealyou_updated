import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';

import {
  findMockProductById,
  findMockProductBySlug,
  listMockProducts,
  type Product,
  type ProductPriceTier,
  type ProductPrintArea,
  type ProductVariant,
} from '@custom-merch/shared';

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

@Controller('products')
export class ProductsController {
  /** GET /products?category=t-shirts&page=1&pageSize=24 */
  @Get()
  list(
    @Query('category') category?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '24',
  ): ProductListResponse {
    const items = listMockProducts({ category });
    const p = Math.max(1, Number(page) || 1);
    const ps = Math.min(60, Math.max(1, Number(pageSize) || 24));
    const start = (p - 1) * ps;
    return {
      items: items.slice(start, start + ps),
      total: items.length,
      page: p,
      pageSize: ps,
    };
  }

  /** GET /products/:slug */
  @Get(':slug')
  getBySlug(@Param('slug') slug: string): Product {
    const bundle = findMockProductBySlug(slug);
    if (!bundle) throw new NotFoundException(`Product not found: ${slug}`);
    return bundle.product;
  }

  /** GET /products/by-id/:id/variants */
  @Get('by-id/:id/variants')
  variants(@Param('id') id: string): ProductVariant[] {
    const bundle = findMockProductById(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.variants;
  }

  /** GET /products/by-id/:id/print-areas */
  @Get('by-id/:id/print-areas')
  printAreas(@Param('id') id: string): ProductPrintArea[] {
    const bundle = findMockProductById(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.printAreas;
  }

  /** GET /products/by-id/:id/price-tiers */
  @Get('by-id/:id/price-tiers')
  priceTiers(@Param('id') id: string): ProductPriceTier[] {
    const bundle = findMockProductById(id);
    if (!bundle) throw new NotFoundException(`Product not found: ${id}`);
    return bundle.priceTiers;
  }
}
