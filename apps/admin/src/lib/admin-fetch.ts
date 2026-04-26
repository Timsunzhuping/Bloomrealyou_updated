import { ADMIN_TOKEN_COOKIE } from './auth-cookies';

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

/**
 * Browser-side fetch wrapper that attaches the admin bearer token from the
 * `cmp_admin_token` cookie. Forms in `apps/admin/src/components/...` use
 * this so they don't have to re-read the cookie everywhere.
 */
export async function adminFetch(
  baseUrl: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = readCookie(ADMIN_TOKEN_COOKIE);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (token) headers['authorization'] = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { ...init, headers });
}
