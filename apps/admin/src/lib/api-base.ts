/**
 * Client-friendly version of `getApiBaseUrl()` from `lib/api.ts`. Pure
 * function so it can be imported by 'use client' modules without dragging in
 * `cookies()` or other server-only helpers.
 */
export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000'
  );
}
