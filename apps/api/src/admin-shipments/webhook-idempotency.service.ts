import { Injectable } from '@nestjs/common';

/**
 * In-memory dedup for webhook deliveries.
 *
 * Carriers retry aggressively. Each event carries a stable `(provider, key)`
 * pair (EasyPost: `result.id` + `tracker.updated_at`; 17track: `number` +
 * `latest_event.time_iso`; Shippo: `event_object_id` + `transmitted_at`).
 * The first call to `claim()` for that key returns `true`; later calls
 * return `false` and the controller short-circuits with a 200 OK so the
 * carrier stops retrying.
 *
 * The cache is bounded to 5 000 entries with FIFO eviction so a sustained
 * burst can't run the process out of memory. Once we move to Redis (or just
 * Postgres) this becomes a `WHERE event_key NOT IN ...` check; the public
 * surface stays the same.
 */
@Injectable()
export class WebhookIdempotencyService {
  private readonly seen = new Map<string, number>();
  private readonly maxEntries = 5000;

  /**
   * Returns `true` when this event hasn't been seen, `false` for duplicates.
   * Mutating call: a `true` result reserves the slot for `ttlMs`.
   */
  claim(key: string, ttlMs = 24 * 60 * 60 * 1000): boolean {
    const now = Date.now();
    const expiry = this.seen.get(key);
    if (expiry && expiry > now) return false;

    this.seen.set(key, now + ttlMs);
    if (this.seen.size > this.maxEntries) {
      // Drop the oldest entry. Maps preserve insertion order so the first key
      // is the oldest (or its TTL expired, in which case we'd skip it on next
      // probe anyway).
      const oldestKey = this.seen.keys().next().value;
      if (oldestKey) this.seen.delete(oldestKey);
    }
    return true;
  }

  /** Test helper. */
  clear(): void {
    this.seen.clear();
  }

  /** Inspect — returns true when the key is currently held. */
  has(key: string): boolean {
    const expiry = this.seen.get(key);
    return Boolean(expiry && expiry > Date.now());
  }
}
