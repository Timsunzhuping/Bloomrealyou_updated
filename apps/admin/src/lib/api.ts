import { createApiClient, type ApiClient } from '@custom-merch/sdk';

let cached: ApiClient | undefined;

/**
 * Server-side admin API client. The admin app does not need anonymous-cart
 * sessions, so we reuse the SDK with the default in-memory session storage.
 * Built lazily so unit tests / build steps that don't hit the API don't blow
 * up on missing env vars.
 */
export function getAdminApi(): ApiClient {
  if (!cached) {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000';
    cached = createApiClient({
      baseUrl,
      // Disable Next.js fetch caching for admin reads — we want fresh data.
      next: { revalidate: 0 },
    });
  }
  return cached;
}
