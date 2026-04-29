import { Injectable } from '@nestjs/common';

import type { IdempotencyStore } from './idempotency-store';

/**
 * Single-process FIFO-evicting dedup. Bounded to 5 000 entries to cap memory.
 * The map preserves insertion order, so the oldest entry is always at the
 * head — eviction is O(1).
 */
@Injectable()
export class InMemoryIdempotencyStore implements IdempotencyStore {
  readonly name = 'in-memory' as const;
  private readonly seen = new Map<string, number>();
  private readonly maxEntries = 5000;

  async claim(key: string, ttlMs = 24 * 60 * 60 * 1000): Promise<boolean> {
    const now = Date.now();
    const expiry = this.seen.get(key);
    if (expiry && expiry > now) return false;

    this.seen.set(key, now + ttlMs);
    if (this.seen.size > this.maxEntries) {
      const oldestKey = this.seen.keys().next().value;
      if (oldestKey) this.seen.delete(oldestKey);
    }
    return true;
  }

  async has(key: string): Promise<boolean> {
    const expiry = this.seen.get(key);
    return Boolean(expiry && expiry > Date.now());
  }

  /** Test helper. */
  clear(): void {
    this.seen.clear();
  }
}
