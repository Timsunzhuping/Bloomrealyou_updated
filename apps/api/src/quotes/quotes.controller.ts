import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import type { OrderDto, QuoteDto, QuoteStatus } from '@custom-merch/shared';

import { AdminBearerGuard } from '../admin-auth/admin-bearer.guard';
import { RequirePermission } from '../admin-auth/admin-permissions.decorator';

import { ConvertQuoteBody, CreateQuoteBody, UpdateQuoteBody } from './quotes.dto';
import { QuotesService } from './quotes.service';

@Controller('admin')
@UseGuards(AdminBearerGuard)
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  /** POST /admin/rfqs/:id/quotes — sales drafts a quote against an RFQ. */
  @Post('rfqs/:id/quotes')
  @RequirePermission('quotes.write')
  @HttpCode(201)
  createForRfq(@Param('id') rfqId: string, @Body() body: CreateQuoteBody): QuoteDto {
    return this.service.createForRfq(rfqId, body);
  }

  /** GET /admin/quotes?status=&rfqId= */
  @Get('quotes')
  @RequirePermission('quotes.read')
  list(
    @Query('status') status?: QuoteStatus,
    @Query('rfqId') rfqId?: string,
  ): { items: QuoteDto[]; total: number } {
    const items = this.service.list({ status, rfqId });
    return { items, total: items.length };
  }

  /** GET /admin/quotes/:id */
  @Get('quotes/:id')
  @RequirePermission('quotes.read')
  get(@Param('id') id: string): QuoteDto {
    return this.service.get(id);
  }

  /** PATCH /admin/quotes/:id */
  @Patch('quotes/:id')
  @RequirePermission('quotes.write')
  @HttpCode(200)
  update(@Param('id') id: string, @Body() body: UpdateQuoteBody): QuoteDto {
    return this.service.update(id, body);
  }

  /** POST /admin/quotes/:id/convert-to-order */
  @Post('quotes/:id/convert-to-order')
  @RequirePermission('quotes.write')
  @HttpCode(201)
  convert(@Param('id') id: string, @Body() body: ConvertQuoteBody): OrderDto {
    return this.service.convertToOrder(id, body);
  }
}
