import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AdminProductDto, AdminUserDto } from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  CreateProductBody,
  UpdateProductBody,
  UpsertPriceTierBody,
  UpsertPrintAreaBody,
  UpsertVariantBody,
} from './admin-products.dto';
import { AdminProductsService } from './admin-products.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/products')
@UseGuards(AdminBearerGuard)
export class AdminProductsController {
  constructor(private readonly service: AdminProductsService) {}

  @Get()
  @RequirePermission('products.read')
  list(
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminProductDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      category,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('products.write')
  @HttpCode(201)
  create(@Body() body: CreateProductBody, @Req() req: ReqWithAdmin): Promise<AdminProductDto> {
    return this.service.create(body, actor(req));
  }

  @Get(':id')
  @RequirePermission('products.read')
  get(@Param('id') id: string): AdminProductDto {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission('products.write')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() body: UpdateProductBody,
    @Req() req: ReqWithAdmin,
  ): Promise<AdminProductDto> {
    return this.service.update(id, body, actor(req));
  }

  @Delete(':id')
  @RequirePermission('products.write')
  @HttpCode(204)
  delete(@Param('id') id: string, @Req() req: ReqWithAdmin): void {
    this.service.delete(id, actor(req));
  }
}

@Controller('admin')
@UseGuards(AdminBearerGuard)
export class AdminProductChildrenController {
  constructor(private readonly service: AdminProductsService) {}

  @Post('product-variants')
  @RequirePermission('products.write')
  @HttpCode(200)
  upsertVariant(
    @Body() body: UpsertVariantBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.upsertVariant(body, actor(req));
  }

  @Patch('product-variants/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  updateVariant(
    @Param('id') id: string,
    @Body() body: UpsertVariantBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.upsertVariant({ ...body, id }, actor(req));
  }

  @Delete('product-variants/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  deleteVariant(
    @Param('id') id: string,
    @Query('productId') productId: string,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.removeVariant(productId, id, actor(req));
  }

  @Post('product-print-areas')
  @RequirePermission('products.write')
  @HttpCode(200)
  upsertPrintArea(@Body() body: UpsertPrintAreaBody, @Req() req: ReqWithAdmin): AdminProductDto {
    return this.service.upsertPrintArea(body, actor(req));
  }

  @Patch('product-print-areas/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  updatePrintArea(
    @Param('id') id: string,
    @Body() body: UpsertPrintAreaBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.upsertPrintArea({ ...body, id }, actor(req));
  }

  @Delete('product-print-areas/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  deletePrintArea(
    @Param('id') id: string,
    @Query('productId') productId: string,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.removePrintArea(productId, id, actor(req));
  }

  @Post('product-price-tiers')
  @RequirePermission('products.write')
  @HttpCode(200)
  upsertPriceTier(@Body() body: UpsertPriceTierBody, @Req() req: ReqWithAdmin): AdminProductDto {
    return this.service.upsertPriceTier(body, actor(req));
  }

  @Patch('product-price-tiers/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  updatePriceTier(
    @Param('id') id: string,
    @Body() body: UpsertPriceTierBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.upsertPriceTier({ ...body, id }, actor(req));
  }

  @Delete('product-price-tiers/:id')
  @RequirePermission('products.write')
  @HttpCode(200)
  deletePriceTier(
    @Param('id') id: string,
    @Query('productId') productId: string,
    @Req() req: ReqWithAdmin,
  ): AdminProductDto {
    return this.service.removePriceTier(productId, id, actor(req));
  }
}
