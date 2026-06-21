import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { CartDto, CartItemDto } from '@custom-merch/shared';

import { SnapshotStore } from '../_lib/snapshot-store';

const KIND = 'cart';

interface InternalCart {
  id: string;
  sessionId: string;
  items: CartItemDto[];
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
      this.cartsBySession.set(row.data.sessionId, row.data);
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
    this.persist(cart);
    return cart;
  }

  removeItem(sessionId: string, itemId: string): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = cart.items.filter((i) => i.id !== itemId);
    cart.updatedAt = new Date().toISOString();
    this.persist(cart);
    return cart;
  }

  replaceItems(sessionId: string, items: CartItemDto[]): InternalCart {
    const cart = this.ensure(sessionId);
    cart.items = items;
    cart.updatedAt = new Date().toISOString();
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
