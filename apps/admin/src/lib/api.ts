import { createApiClient, type ApiClient } from '@custom-merch/sdk';
import { cookies } from 'next/headers';

import { ADMIN_TOKEN_COOKIE } from './auth-cookies';

/**
 * Server-side admin API client. Builds a fresh client on every call so the
 * bearer token reflects the current request's cookies — long-lived caches
 * would leak the previous user's identity across requests.
 */
export async function getAdminApi(): Promise<ApiClient> {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000';
  const jar = await cookies();
  const adminToken = jar.get(ADMIN_TOKEN_COOKIE)?.value ?? null;
  return createApiClient({
    baseUrl,
    next: { revalidate: 0 },
    adminToken,
  });
}

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000'
  );
}
