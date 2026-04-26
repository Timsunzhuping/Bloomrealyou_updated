import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import type { OrderDto } from '@custom-merch/shared';

import { CreateOrderBody } from './orders.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  /** POST /orders */
  @Post()
  create(@Body() body: CreateOrderBody): OrderDto {
    return this.service.createFromCart(body);
  }

  /** GET /orders/:id */
  @Get(':id')
  get(@Param('id') id: string): OrderDto {
    return this.service.get(id);
  }

  /** GET /orders/by-number/:orderNumber */
  @Get('by-number/:orderNumber')
  getByNumber(@Param('orderNumber') orderNumber: string): OrderDto {
    return this.service.getByNumber(orderNumber);
  }
}
