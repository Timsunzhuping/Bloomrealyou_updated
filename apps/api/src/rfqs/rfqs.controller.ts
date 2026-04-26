import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { RfqDto, RFQStatus } from '@custom-merch/shared';

import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { CreateRFQBody, UpdateRFQStatusBody } from './rfqs.dto';
import { RFQsService } from './rfqs.service';

@Controller()
export class RFQsController {
  constructor(private readonly service: RFQsService) {}

  /** POST /rfqs — corporate-facing submit endpoint (anonymous). */
  @Post('rfqs')
  @HttpCode(201)
  async create(@Body() body: CreateRFQBody): Promise<RfqDto> {
    return this.service.create(body);
  }

  /** GET /admin/rfqs?status=... — admin list. */
  @Get('admin/rfqs')
  @UseGuards(AdminBearerGuard)
  @RequirePermission('rfqs.read')
  list(@Query('status') status?: RFQStatus): { items: RfqDto[]; total: number } {
    const items = this.service.list(status ? { status } : undefined);
    return { items, total: items.length };
  }

  /** GET /admin/rfqs/:id — admin detail. */
  @Get('admin/rfqs/:id')
  @UseGuards(AdminBearerGuard)
  @RequirePermission('rfqs.read')
  get(@Param('id') id: string): RfqDto {
    return this.service.get(id);
  }

  /** PATCH /admin/rfqs/:id/status — sales status transition. */
  @Patch('admin/rfqs/:id/status')
  @UseGuards(AdminBearerGuard)
  @RequirePermission('rfqs.write')
  @HttpCode(200)
  setStatus(@Param('id') id: string, @Body() body: UpdateRFQStatusBody): RfqDto {
    return this.service.setStatus(id, body.status);
  }
}
