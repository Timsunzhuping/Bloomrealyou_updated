import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CartDto, CartItemDto } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'cart';
const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface InternalCart {
  id: string;
  sessionId: string;
  items: CartItemDto[];
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Cart store keyed by anonymous session id. The in-memory map is the runtime
 * source of truth; the {@link SnapshotStore} makes it durable across restarts
 * so an in-progress checkout survives a redeploy.
 *
 * Empty carts created lazily by {@link ensure} are not persisted — only
 * mutations (saveItem / removeItem / replaceItems) write through.
 */
@Injectable()
export class CartRepository implements OnModuleInit {
  private readonly log = new Logger(CartRepository.name);
  private readonly cartsBySession = new Map<string, InternalCart>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<InternalCart>(KIND);
    for (const row of rows) {
      const cart = normaliseCart(row.data);
      if (isExpired(cart)) {
        this.snapshots.remove(KIND, row.entityId);
        continue;
      }
      this.cartsBySession.set(cart.sessionId, cart);
    }
    if (rows.length > 0) {
      this.log.log(`Primed ${rows.length} carts from durable store`);
    }
  }

  private persist(cart: InternalCart): void {
    this.snapshots.put(KIND, cart.sessionId, cart, cart.id);
  }

  ensure(sessionId: string): InternalCart {
    let cart = this.cartsBySession.get(sessionId);
    if (cart && isExpired(cart)) {
      this.cartsBySession.delete(sessionId);
      this.snapshots.remove(KIND, sessionId);
      cart = undefined;
    }
    if (!cart) {
      const now = new Date().toISOString();
      cart = {
        id: randomUUID(),
        sessionId,
        items: [],
        expiresAt: expiresAtFromNow(),
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
    cart.expiresAt = expiresAtFromNow();
    this.persist(cart);
    return cart;
  }

  removeItem(sessionId: string, itemId: string): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = cart.items.filter((i) => i.id !== itemId);
    cart.updatedAt = new Date().toISOString();
    cart.expiresAt = expiresAtFromNow();
    this.persist(cart);
    return cart;
  }

  replaceItems(sessionId: string, items: CartItemDto[]): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = items;
    cart.updatedAt = new Date().toISOString();
    cart.expiresAt = expiresAtFromNow();
    this.persist(cart);
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

function expiresAtFromNow(now = Date.now()): string {
  return new Date(now + CART_TTL_MS).toISOString();
}

function isExpired(cart: InternalCart, now = Date.now()): boolean {
  return new Date(cart.expiresAt).getTime() <= now;
}

function normaliseCart(cart: InternalCart): InternalCart {
  if (cart.expiresAt) return cart;
  const base = new Date(cart.updatedAt || cart.createdAt).getTime();
  return {
    ...cart,
    expiresAt: expiresAtFromNow(Number.isFinite(base) ? base : Date.now()),
  };
}
