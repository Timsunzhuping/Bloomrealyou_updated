import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import type {
  AccountOrderDetailDto,
  AccountProfileDto,
  AccountQuoteSummaryDto,
  CartDto,
  CustomerDesignDto,
  OrderDto,
  SavedAddressDto,
} from '@custom-merch/shared';

import {
  ReorderBody,
  SaveAddressBody,
  UpdateAddressBody,
  UpdateProfileBody,
} from './account.dto';
import { AccountService } from './account.service';

const SESSION_HEADER = 'x-cart-session';

function requireSession(header: string | undefined): string {
  if (!header || !header.trim()) {
    throw new BadRequestException(`Missing ${SESSION_HEADER} header`);
  }
  return header.trim();
}

@Controller('account')
export class AccountController {
  constructor(private readonly service: AccountService) {}

  /** GET /account/profile */
  @Get('profile')
  getProfile(@Headers(SESSION_HEADER) header: string | undefined): AccountProfileDto {
    return this.service.getProfile(requireSession(header));
  }

  /** PATCH /account/profile */
  @Patch('profile')
  updateProfile(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Body() body: UpdateProfileBody,
  ): AccountProfileDto {
    return this.service.updateProfile(requireSession(header), body);
  }

  // -- Addresses ---------------------------------------------------------

  /** GET /account/addresses */
  @Get('addresses')
  listAddresses(@Headers(SESSION_HEADER) header: string | undefined): SavedAddressDto[] {
    return this.service.listAddresses(requireSession(header));
  }

  /** POST /account/addresses */
  @Post('addresses')
  saveAddress(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Body() body: SaveAddressBody,
  ): SavedAddressDto {
    return this.service.saveAddress(requireSession(header), body);
  }

  /** PATCH /account/addresses/:id */
  @Patch('addresses/:id')
  updateAddress(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('id') id: string,
    @Body() body: UpdateAddressBody,
  ): SavedAddressDto {
    return this.service.updateAddress(requireSession(header), id, body);
  }

  /** DELETE /account/addresses/:id */
  @Delete('addresses/:id')
  @HttpCode(200)
  removeAddress(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('id') id: string,
  ): { ok: true } {
    return this.service.removeAddress(requireSession(header), id);
  }

  // -- Orders ------------------------------------------------------------

  /** GET /account/orders */
  @Get('orders')
  listOrders(@Headers(SESSION_HEADER) header: string | undefined): OrderDto[] {
    return this.service.listOrders(requireSession(header));
  }

  /** GET /account/orders/:orderNumber */
  @Get('orders/:orderNumber')
  getOrder(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('orderNumber') orderNumber: string,
  ): AccountOrderDetailDto {
    return this.service.getOrderDetail(requireSession(header), orderNumber);
  }

  // -- Designs -----------------------------------------------------------

  /** GET /account/designs */
  @Get('designs')
  listDesigns(@Headers(SESSION_HEADER) header: string | undefined): CustomerDesignDto[] {
    return this.service.listDesigns(requireSession(header));
  }

  /** POST /account/designs/:id/reorder */
  @Post('designs/:id/reorder')
  @HttpCode(200)
  reorder(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('id') designId: string,
    @Body() body: ReorderBody,
  ): CartDto {
    return this.service.reorder(requireSession(header), designId, body);
  }

  // -- Quotes ------------------------------------------------------------

  /** GET /account/quotes */
  @Get('quotes')
  listQuotes(@Headers(SESSION_HEADER) header: string | undefined): AccountQuoteSummaryDto[] {
    return this.service.listQuotes(requireSession(header));
  }
}
