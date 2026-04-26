'use client';

import { createApiClient, type ApiClient } from '@custom-merch/sdk';

let cached: ApiClient | undefined;

/**
 * Returns a browser-side ApiClient. This is intentionally separate from
 * `lib/api.ts` (server-only) so that the cache controls / fetch instance are
 * tuned for the client lifecycle.
 */
export function getClientApi(): ApiClient {
  if (!cached) {
    const baseUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
      'http://localhost:4000';
    cached = createApiClient({ baseUrl });
  }
  return cached;
}
