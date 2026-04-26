import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';

import type { OrderDto, QuoteDto, QuoteStatus } from '@custom-merch/shared';

import { ConvertQuoteBody, CreateQuoteBody, UpdateQuoteBody } from './quotes.dto';
import { QuotesService } from './quotes.service';

@Controller('admin')
export class QuotesController {
  constructor(private readonly service: QuotesService) {}

  /** POST /admin/rfqs/:id/quotes — sales drafts a quote against an RFQ. */
  @Post('rfqs/:id/quotes')
  @HttpCode(201)
  createForRfq(@Param('id') rfqId: string, @Body() body: CreateQuoteBody): QuoteDto {
    return this.service.createForRfq(rfqId, body);
  }

  /** GET /admin/quotes?status=&rfqId= */
  @Get('quotes')
  list(
    @Query('status') status?: QuoteStatus,
    @Query('rfqId') rfqId?: string,
  ): { items: QuoteDto[]; total: number } {
    const items = this.service.list({ status, rfqId });
    return { items, total: items.length };
  }

  /** GET /admin/quotes/:id */
  @Get('quotes/:id')
  get(@Param('id') id: string): QuoteDto {
    return this.service.get(id);
  }

  /** PATCH /admin/quotes/:id */
  @Patch('quotes/:id')
  @HttpCode(200)
  update(@Param('id') id: string, @Body() body: UpdateQuoteBody): QuoteDto {
    return this.service.update(id, body);
  }

  /** POST /admin/quotes/:id/convert-to-order */
  @Post('quotes/:id/convert-to-order')
  @HttpCode(201)
  convert(@Param('id') id: string, @Body() body: ConvertQuoteBody): OrderDto {
    return this.service.convertToOrder(id, body);
  }
}
