import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CartDto, CartItemDto } from '@custom-merch/shared';

interface InternalCart {
  id: string;
  sessionId: string;
  items: CartItemDto[];
  createdAt: string;
  updatedAt: string;
}

/**
 * In-memory cart store keyed by anonymous session id. Mirrors the future
 * Prisma `carts` + `cart_items` tables so swapping in a real repository is
 * mechanical.
 */
@Injectable()
export class CartRepository {
  private readonly cartsBySession = new Map<string, InternalCart>();

  ensure(sessionId: string): InternalCart {
    let cart = this.cartsBySession.get(sessionId);
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: randomUUID(),
        sessionId,
        items: [],
        createdAt: now,
        updatedAt: now,
      };
      this.cartsBySession.set(sessionId, cart);
    }
    return cart;
  }

  saveItem(sessionId: string, item: CartItemDto): InternalCart {
    const cart = this.ensure(sessionId);
    const existingIdx = cart.items.findIndex((i) => i.id === item.id);
    if (existingIdx >= 0) cart.items[existingIdx] = item;
    else cart.items.push(item);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  removeItem(sessionId: string, itemId: string): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = cart.items.filter((i) => i.id !== itemId);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  replaceItems(sessionId: string, items: CartItemDto[]): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = items;
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  /** Build the public DTO. Computes derived totals fresh from items. */
  toDto(sessionId: string): CartDto {
    const cart = this.ensure(sessionId);
    const currency =
      cart.items[0]?.unitPrice.currency ?? 'USD';
    const subtotalMinor = cart.items.reduce(
      (acc, i) => acc + i.pricingSnapshot.subtotal.amountMinor,
      0,
    );
    const shippingMinor = cart.items.reduce(
      (acc, i) => acc + i.pricingSnapshot.shippingFee.amountMinor,
      0,
    );
    const totalMinor = cart.items.reduce(
      (acc, i) => acc + i.totalPrice.amountMinor,
      0,
    );
    return {
      id: cart.id,
      sessionId: cart.sessionId,
      userId: null,
      status: 'active',
      currency,
      items: cart.items,
      itemCount: cart.items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal: { amountMinor: subtotalMinor, currency },
      shipping: { amountMinor: shippingMinor, currency },
      tax: { amountMinor: 0, currency },
      total: { amountMinor: totalMinor, currency },
      promoCode: null,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }
}
