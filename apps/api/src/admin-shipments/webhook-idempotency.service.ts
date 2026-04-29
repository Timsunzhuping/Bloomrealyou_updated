import { Inject, Injectable } from '@nestjs/common';

import { IDEMPOTENCY_STORE } from '../_lib/idempotency-store.tokens';
import type { IdempotencyStore } from '../_lib/idempotency-store';

/**
 * Thin webhook-scoped wrapper over the active {@link IdempotencyStore}.
 *
 * Carriers retry aggressively. Each event carries a stable `(provider, key)`
 * pair (EasyPost: `result.id` + `tracker.updated_at`; 17track: `number` +
 * `latest_event.time_iso`; Shippo: `event_object_id` + `transmitted_at`).
 * The first call to `claim()` wins; later calls are dropped with 200 OK so
 * the carrier stops retrying.
 *
 * The actual storage is provided by Nest DI — single-instance deployments
 * use the in-memory implementation (default), multi-instance deployments
 * set `IDEMPOTENCY_STORE=redis` and inject the Redis-backed adapter.
 */
@Injectable()
export class WebhookIdempotencyService {
  constructor(@Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore) {}

  async claim(key: string, ttlMs?: number): Promise<boolean> {
    return this.store.claim(key, ttlMs);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  /** Friendly diagnostic for boot logs. */
  backendName(): string {
    return this.store.name;
  }
}
