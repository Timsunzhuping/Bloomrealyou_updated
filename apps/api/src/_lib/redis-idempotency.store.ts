import { Injectable, Logger } from '@nestjs/common';

import type { IdempotencyStore } from './idempotency-store';

interface RedisLike {
  set(
    key: string,
    value: string,
    options?: { px?: number; nx?: boolean },
  ): Promise<string | null>;
  exists(key: string): Promise<number>;
}

/**
 * Redis-backed dedup using `SET key 1 NX PX <ttl>`. The atomic SET-if-absent
 * primitive guarantees exactly-once delivery across multiple API replicas:
 * the first replica that calls `claim()` for a given key wins; the rest see
 * `null` (Redis returns `null` when NX fails) and short-circuit.
 *
 * The constructor takes a pre-built client so the actual client library
 * (`ioredis`, `redis`, `keyv`, etc.) stays a deployment choice. The factory
 * resolves which client to inject based on env.
 */
@Injectable()
export class RedisIdempotencyStore implements IdempotencyStore {
  readonly name = 'redis' as const;
  private readonly log = new Logger(RedisIdempotencyStore.name);

  constructor(
    private readonly client: RedisLike,
    private readonly keyPrefix = 'webhook-idem:',
  ) {}

  async claim(key: string, ttlMs = 24 * 60 * 60 * 1000): Promise<boolean> {
    const fullKey = this.keyPrefix + key;
    try {
      const result = await this.client.set(fullKey, '1', { px: ttlMs, nx: true });
      // `ioredis` returns 'OK' on success, `null` when NX prevented the set.
      // `node-redis` returns 'OK' / null too.
      return result === 'OK';
    } catch (e) {
      this.log.warn(`Redis claim failed (${(e as Error).message}); falling back to allow`);
      // When Redis is unavailable we err on the side of *processing* the
      // webhook rather than silently dropping it. The downstream service
      // is idempotent in its own right (status mirroring is order-aware).
      return true;
    }
  }

  async has(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(this.keyPrefix + key);
      return exists > 0;
    } catch {
      return false;
    }
  }
}
