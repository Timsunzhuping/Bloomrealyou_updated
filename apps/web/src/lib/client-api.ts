'use client';

import { createApiClient, type ApiClient, type SessionStorage } from '@custom-merch/sdk';

const SESSION_KEY = 'cmp:cartSessionId';

class LocalSessionStorage implements SessionStorage {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  }
  set(value: string): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(SESSION_KEY, value);
    } catch {
      /* ignore */
    }
  }
  clear(): void {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  }
}

let cached: ApiClient | undefined;

/**
 * Returns a browser-side ApiClient. The localStorage-backed SessionStorage
 * persists the anonymous cart session id across reloads, so the cart survives
 * page transitions for the same browser.
 */
export function getClientApi(): ApiClient {
  if (!cached) {
    const baseUrl =
      (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) ||
      'http://localhost:4000';
    cached = createApiClient({ baseUrl, sessionStorage: new LocalSessionStorage() });
  }
  return cached;
}
