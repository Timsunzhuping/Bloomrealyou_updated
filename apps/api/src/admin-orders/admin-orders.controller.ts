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

import type { AdminUserDto, OrderStatus } from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { AdminOrderNoteBody, AdminOrderStatusUpdateBody } from './admin-orders.dto';
import { AdminOrdersService, type AdminOrderSummary } from './admin-orders.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/orders')
@UseGuards(AdminBearerGuard)
export class AdminOrdersController {
  constructor(private readonly service: AdminOrdersService) {}

  @Get()
  @RequirePermission('orders.read')
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('flaggedOnly') flaggedOnly?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminOrderSummary[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      status: status as OrderStatus | undefined,
      flaggedOnly: flaggedOnly === 'true',
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id')
  @RequirePermission('orders.read')
  get(@Param('id') id: string): AdminOrderSummary {
    return this.service.get(id);
  }

  @Patch(':id/status')
  @RequirePermission('orders.write')
  @HttpCode(200)
  setStatus(
    @Param('id') id: string,
    @Body() body: AdminOrderStatusUpdateBody,
    @Req() req: ReqWithAdmin,
  ): AdminOrderSummary {
    return this.service.setStatus(
      id,
      { status: body.status, note: body.note, flagException: body.flagException },
      actor(req),
    );
  }

  @Post(':id/notes')
  @RequirePermission('orders.write')
  @HttpCode(201)
  appendNote(
    @Param('id') id: string,
    @Body() body: AdminOrderNoteBody,
    @Req() req: ReqWithAdmin,
  ): AdminOrderSummary {
    return this.service.appendNote(id, body.body, actor(req));
  }
}
