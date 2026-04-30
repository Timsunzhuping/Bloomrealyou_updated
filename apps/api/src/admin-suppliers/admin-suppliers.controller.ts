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

import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  AdminUserDto,
  SupplierRecommendResponse,
} from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  CreateMappingBody,
  CreateSupplierBody,
  RecommendSuppliersBody,
  UpdateMappingBody,
  UpdateSupplierBody,
} from './admin-suppliers.dto';
import { AdminSuppliersService } from './admin-suppliers.service';
import { SupplierRoutingService } from './supplier-routing.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/suppliers')
@UseGuards(AdminBearerGuard)
export class AdminSuppliersController {
  constructor(
    private readonly service: AdminSuppliersService,
    private readonly routing: SupplierRoutingService,
  ) {}

  @Get()
  @RequirePermission('suppliers.read')
  list(
    @Query('q') q?: string,
    @Query('country') country?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminSupplierDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      country,
      status,
      category,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('suppliers.write')
  @HttpCode(201)
  create(@Body() body: CreateSupplierBody, @Req() req: ReqWithAdmin): AdminSupplierDto {
    return this.service.create(body, actor(req));
  }

  @Get(':id')
  @RequirePermission('suppliers.read')
  get(@Param('id') id: string): AdminSupplierDto {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission('suppliers.write')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() body: UpdateSupplierBody,
    @Req() req: ReqWithAdmin,
  ): AdminSupplierDto {
    return this.service.update(id, body, actor(req));
  }

  @Delete(':id')
  @RequirePermission('suppliers.write')
  @HttpCode(204)
  delete(@Param('id') id: string, @Req() req: ReqWithAdmin): void {
    this.service.delete(id, actor(req));
  }

  /** POST /admin/suppliers/recommend — rule-based scoring engine. */
  @Post('recommend')
  @RequirePermission('suppliers.read')
  @HttpCode(200)
  recommend(@Body() body: RecommendSuppliersBody): SupplierRecommendResponse {
    return this.routing.recommend(body);
  }
}

@Controller('admin/supplier-product-mappings')
@UseGuards(AdminBearerGuard)
export class AdminMappingsController {
  constructor(private readonly service: AdminSuppliersService) {}

  @Get()
  @RequirePermission('suppliers.read')
  list(
    @Query('supplierId') supplierId?: string,
    @Query('productId') productId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminSupplierProductMappingDto[]; total: number; page: number; pageSize: number } {
    return this.service.listMappings({
      supplierId,
      productId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('suppliers.write')
  @HttpCode(201)
  create(
    @Body() body: CreateMappingBody,
    @Req() req: ReqWithAdmin,
  ): AdminSupplierProductMappingDto {
    return this.service.createMapping(body, actor(req));
  }

  @Patch(':id')
  @RequirePermission('suppliers.write')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() body: UpdateMappingBody,
    @Req() req: ReqWithAdmin,
  ): AdminSupplierProductMappingDto {
    return this.service.updateMapping(id, body, actor(req));
  }
}
