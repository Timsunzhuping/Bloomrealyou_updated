import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { AdminProductionJobDto, AdminUserDto } from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import {
  AssignProductionSupplierBody,
  CreateProductionJobBody,
  UpdateProductionJobStatusBody,
  UploadQcResultBody,
} from './admin-production.dto';
import { AdminProductionService } from './admin-production.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/production-jobs')
@UseGuards(AdminBearerGuard)
export class AdminProductionController {
  constructor(private readonly service: AdminProductionService) {}

  @Get()
  @RequirePermission('production-jobs.read')
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('supplierId') supplierId?: string,
    @Query('orderId') orderId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminProductionJobDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      status,
      supplierId,
      orderId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('production-jobs.write')
  @HttpCode(201)
  create(
    @Body() body: CreateProductionJobBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductionJobDto {
    return this.service.create(body, actor(req));
  }

  @Get(':id')
  @RequirePermission('production-jobs.read')
  get(@Param('id') id: string): AdminProductionJobDto {
    return this.service.get(id);
  }

  @Patch(':id/status')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  setStatus(
    @Param('id') id: string,
    @Body() body: UpdateProductionJobStatusBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductionJobDto {
    return this.service.setStatus(id, body, actor(req));
  }

  @Post(':id/assign-supplier')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  assignSupplier(
    @Param('id') id: string,
    @Body() body: AssignProductionSupplierBody,
    @Req() req: ReqWithAdmin,
  ): AdminProductionJobDto {
    return this.service.assignSupplier(id, body, actor(req));
  }

  @Post(':id/upload-qc')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  uploadQc(
    @Param('id') id: string,
    @Body() body: UploadQcResultBody,
    @Req() req: ReqWithAdmin,
  ): Promise<AdminProductionJobDto> {
    return this.service.uploadQc(id, body, actor(req));
  }
}
