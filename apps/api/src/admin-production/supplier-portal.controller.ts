import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  AdminProductionJobDto,
  AdminUserDto,
  ProductionJobStatus,
} from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { UploadQcResultBody } from './admin-production.dto';
import { AdminProductionService } from './admin-production.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

/**
 * Supplier-portal endpoints. Every route is double-scoped:
 *   1. Standard {@link AdminBearerGuard} + permission check (defence in depth).
 *   2. The service-layer `assertOwnsJob` rejects access to jobs whose
 *      `supplierId` doesn't match the caller's `supplierId`, so a leaked
 *      token can never see another supplier's queue.
 *
 * The wider admin endpoints in `admin-production.controller.ts` remain the
 * source of truth for production-manager and admin roles; this controller
 * exists so suppliers don't have to learn the full admin URL space.
 */
@Controller('supplier-portal/production-jobs')
@UseGuards(AdminBearerGuard)
export class SupplierPortalController {
  constructor(private readonly service: AdminProductionService) {}

  /** GET /supplier-portal/production-jobs — supplier's own queue. */
  @Get()
  @RequirePermission('production-jobs.read')
  list(
    @Req() req: ReqWithAdmin,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminProductionJobDto[]; total: number; page: number; pageSize: number } {
    const me = actor(req);
    const supplierId = requireSupplierId(me);
    return this.service.list({
      supplierId,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('production-jobs.read')
  get(@Param('id') id: string, @Req() req: ReqWithAdmin): AdminProductionJobDto {
    const me = actor(req);
    const supplierId = requireSupplierId(me);
    const job = this.service.get(id);
    assertOwnsJob(job, supplierId);
    return job;
  }

  /** POST /supplier-portal/production-jobs/:id/confirm — supplier accepts the
   *  assignment, advancing `assigned` → `supplier_confirmed`. */
  @Post(':id/confirm')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  confirm(@Param('id') id: string, @Req() req: ReqWithAdmin): AdminProductionJobDto {
    const me = actor(req);
    const supplierId = requireSupplierId(me);
    const job = this.service.get(id);
    assertOwnsJob(job, supplierId);
    if (job.status !== 'assigned') {
      throw new BadRequestException(
        `Cannot confirm a job in status '${job.status}'. Expected 'assigned'.`,
      );
    }
    return this.service.setStatus(
      id,
      { status: 'supplier_confirmed' as ProductionJobStatus, note: 'Supplier confirmed' },
      me,
    );
  }

  /** POST /supplier-portal/production-jobs/:id/start — `supplier_confirmed`
   *  → `in_production`. Suppliers ping this when they kick off the run. */
  @Post(':id/start')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  start(@Param('id') id: string, @Req() req: ReqWithAdmin): AdminProductionJobDto {
    const me = actor(req);
    const supplierId = requireSupplierId(me);
    const job = this.service.get(id);
    assertOwnsJob(job, supplierId);
    if (job.status !== 'supplier_confirmed') {
      throw new BadRequestException(
        `Cannot start a job in status '${job.status}'. Expected 'supplier_confirmed'.`,
      );
    }
    return this.service.setStatus(
      id,
      { status: 'in_production' as ProductionJobStatus, note: 'Supplier started production' },
      me,
    );
  }

  /** POST /supplier-portal/production-jobs/:id/upload-qc — same wire shape as
   *  the admin endpoint. Service-layer audit is unchanged. */
  @Post(':id/upload-qc')
  @RequirePermission('production-jobs.write')
  @HttpCode(200)
  uploadQc(
    @Param('id') id: string,
    @Body() body: UploadQcResultBody,
    @Req() req: ReqWithAdmin,
  ): Promise<AdminProductionJobDto> {
    const me = actor(req);
    const supplierId = requireSupplierId(me);
    const job = this.service.get(id);
    assertOwnsJob(job, supplierId);
    return this.service.uploadQc(id, body, me);
  }
}

function requireSupplierId(user: AdminUserDto): string {
  if (user.role !== 'supplier_user' || !user.supplierId) {
    throw new ForbiddenException(
      'Supplier portal is only accessible to supplier_user accounts',
    );
  }
  return user.supplierId;
}

function assertOwnsJob(job: AdminProductionJobDto, supplierId: string): void {
  if (job.supplierId !== supplierId) {
    throw new ForbiddenException('This production job belongs to a different supplier');
  }
}
