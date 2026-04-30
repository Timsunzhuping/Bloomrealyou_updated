import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Res,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CartDto } from '@custom-merch/shared';

import {
  AddCartItemBody,
  RecalculateCartBody,
  UpdateCartItemBody,
} from './cart.dto';
import { CartService } from './cart.service';

const SESSION_HEADER = 'x-cart-session';

interface ResponseLike {
  setHeader(name: string, value: string): void;
}

function resolveSession(
  incoming: string | undefined,
  res: ResponseLike,
): string {
  const id = incoming?.trim() || randomUUID();
  res.setHeader(SESSION_HEADER, id);
  // CORS exposes which custom headers are visible to the browser.
  res.setHeader('Access-Control-Expose-Headers', SESSION_HEADER);
  return id;
}

@Controller('cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  /** GET /cart — returns the current session's cart, creating it if needed. */
  @Get()
  get(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Res({ passthrough: true }) res: ResponseLike,
  ): CartDto {
    const session = resolveSession(header, res);
    return this.service.get(session);
  }

  /** POST /cart/items */
  @Post('items')
  add(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Body() body: AddCartItemBody,
    @Res({ passthrough: true }) res: ResponseLike,
  ): CartDto {
    const session = resolveSession(header, res);
    return this.service.addItem(session, body);
  }

  /** PATCH /cart/items/:id */
  @Patch('items/:id')
  update(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('id') id: string,
    @Body() body: UpdateCartItemBody,
    @Res({ passthrough: true }) res: ResponseLike,
  ): CartDto {
    const session = resolveSession(header, res);
    return this.service.updateItem(session, id, body);
  }

  /** DELETE /cart/items/:id */
  @Delete('items/:id')
  @HttpCode(200)
  remove(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: ResponseLike,
  ): CartDto {
    const session = resolveSession(header, res);
    return this.service.removeItem(session, id);
  }

  /** POST /cart/recalculate */
  @Post('recalculate')
  @HttpCode(200)
  recalculate(
    @Headers(SESSION_HEADER) header: string | undefined,
    @Body() body: RecalculateCartBody,
    @Res({ passthrough: true }) res: ResponseLike,
  ): CartDto {
    const session = resolveSession(header, res);
    return this.service.recalculate(session, body);
  }
}
