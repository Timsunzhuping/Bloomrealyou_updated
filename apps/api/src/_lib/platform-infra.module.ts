import { Global, Logger, Module, type Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { IDEMPOTENCY_STORE } from './idempotency-store.tokens';
import type { IdempotencyStore } from './idempotency-store';
import { InMemoryIdempotencyStore } from './in-memory-idempotency.store';
import { RedisIdempotencyStore } from './redis-idempotency.store';

const log = new Logger('PlatformInfraModule');

/**
 * Cross-cutting platform infrastructure.
 *
 * Today: the {@link IdempotencyStore} factory. The store is selected via
 * `IDEMPOTENCY_STORE_BACKEND` (default `in-memory`). When `redis` is selected
 * we lazy-import a Redis client (`ioredis` first, falling back to `redis`)
 * so the dep stays optional. If neither lib is installed and Redis is
 * configured, we fall back to in-memory with a loud warning rather than
 * crash at boot.
 *
 * @Global so any module can `@Inject(IDEMPOTENCY_STORE)` without re-importing.
 */
const idempotencyStoreFactory: Provider<IdempotencyStore> = {
  provide: IDEMPOTENCY_STORE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService): Promise<IdempotencyStore> => {
    const backend = config.get<string>('IDEMPOTENCY_STORE_BACKEND') ?? 'in-memory';
    if (backend !== 'redis') {
      log.log('idempotency store: in-memory');
      return new InMemoryIdempotencyStore();
    }

    const url = config.get<string>('REDIS_URL');
    if (!url) {
      log.warn('IDEMPOTENCY_STORE_BACKEND=redis but REDIS_URL missing — using in-memory');
      return new InMemoryIdempotencyStore();
    }

    const client = await loadRedisClient(url);
    if (!client) {
      log.warn(
        'No Redis client library installed (tried `ioredis`, `redis`) — using in-memory',
      );
      return new InMemoryIdempotencyStore();
    }
    log.log(`idempotency store: redis (${redactedUrl(url)})`);
    return new RedisIdempotencyStore(client);
  },
};

interface RedisLike {
  set(key: string, value: string, options?: { px?: number; nx?: boolean }): Promise<string | null>;
  exists(key: string): Promise<number>;
}

async function loadRedisClient(url: string): Promise<RedisLike | null> {
  // Try ioredis first — the most common production choice. Then `redis`.
  for (const mod of ['ioredis', 'redis']) {
    try {
      const lib = (await import(/* webpackIgnore: true */ mod)) as Record<string, unknown>;
      if (mod === 'ioredis') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Ctor = (lib.default ?? lib) as new (url: string) => any;
        const c = new Ctor(url);
        return wrapIoredis(c);
      }
      if (mod === 'redis') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createClient = (lib as any).createClient as (opts: { url: string }) => any;
        const c = createClient({ url });
        await c.connect();
        return wrapNodeRedis(c);
      }
    } catch {
      // Try the next library.
    }
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapIoredis(client: any): RedisLike {
  return {
    async set(key, value, options) {
      const args: unknown[] = [key, value];
      if (options?.px !== undefined) args.push('PX', options.px);
      if (options?.nx) args.push('NX');
      const r = await client.call('SET', ...args);
      return r as string | null;
    },
    async exists(key) {
      return client.exists(key);
    },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wrapNodeRedis(client: any): RedisLike {
  return {
    async set(key, value, options) {
      const r = await client.set(key, value, {
        ...(options?.px ? { PX: options.px } : {}),
        ...(options?.nx ? { NX: true } : {}),
      });
      return r as string | null;
    },
    async exists(key) {
      return client.exists(key);
    },
  };
}

function redactedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.password) u.password = '***';
    return u.toString();
  } catch {
    return '<redacted>';
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [idempotencyStoreFactory],
  exports: [IDEMPOTENCY_STORE],
})
export class PlatformInfraModule {}
