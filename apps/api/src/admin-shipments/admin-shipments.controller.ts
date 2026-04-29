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

import type {
  AdminShipmentDto,
  AdminUserDto,
  OrderTrackingDto,
} from '@custom-merch/shared';

import { ADMIN_USER_REQ_KEY } from '../admin-auth/admin-auth.tokens';
import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { CreateShipmentBody, UpdateShipmentBody } from './admin-shipments.dto';
import { AdminShipmentsService } from './admin-shipments.service';
import { ShippingSyncService } from './shipping-sync.service';

interface ReqWithAdmin {
  [ADMIN_USER_REQ_KEY]?: AdminUserDto;
}

function actor(req: ReqWithAdmin): AdminUserDto {
  const u = req[ADMIN_USER_REQ_KEY];
  if (!u) throw new Error('actor missing — guard misconfigured');
  return u;
}

@Controller('admin/shipments')
@UseGuards(AdminBearerGuard)
export class AdminShipmentsController {
  constructor(
    private readonly service: AdminShipmentsService,
    private readonly sync: ShippingSyncService,
  ) {}

  @Get()
  @RequirePermission('shipments.read')
  list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('orderId') orderId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): { items: AdminShipmentDto[]; total: number; page: number; pageSize: number } {
    return this.service.list({
      q,
      status,
      orderId,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermission('shipments.write')
  @HttpCode(201)
  create(@Body() body: CreateShipmentBody, @Req() req: ReqWithAdmin): AdminShipmentDto {
    return this.service.create(body, actor(req));
  }

  @Get(':id')
  @RequirePermission('shipments.read')
  get(@Param('id') id: string): AdminShipmentDto {
    return this.service.get(id);
  }

  @Patch(':id')
  @RequirePermission('shipments.write')
  @HttpCode(200)
  update(
    @Param('id') id: string,
    @Body() body: UpdateShipmentBody,
    @Req() req: ReqWithAdmin,
  ): AdminShipmentDto {
    return this.service.update(id, body, actor(req));
  }

  /** POST /admin/shipments/:id/sync-tracking — pull a fresh tracking event
   *  from the active ShippingProvider (mock by default, EasyPost when
   *  EASYPOST_API_KEY is set) and persist any status change. */
  @Post(':id/sync-tracking')
  @RequirePermission('shipments.write')
  @HttpCode(200)
  syncTracking(
    @Param('id') id: string,
    @Req() req: ReqWithAdmin,
  ): Promise<AdminShipmentDto> {
    return this.sync.syncOne(id, actor(req));
  }
}

/** Anonymous customer-facing tracking. Lives on its own controller so it
 *  can sit under `/orders/...` without re-using the admin guard. */
@Controller('orders')
export class CustomerTrackingController {
  constructor(private readonly service: AdminShipmentsService) {}

  /** GET /orders/:orderNumber/tracking */
  @Get(':orderNumber/tracking')
  track(@Param('orderNumber') orderNumber: string): OrderTrackingDto {
    return this.service.trackByOrderNumber(orderNumber);
  }
}
