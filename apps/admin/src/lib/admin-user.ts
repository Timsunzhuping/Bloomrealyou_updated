import type { AdminUserDto } from '@custom-merch/shared';
import { cookies } from 'next/headers';

import { ADMIN_USER_COOKIE } from './auth-cookies';

/**
 * Server-side helper that materialises the current admin user from the
 * `cmp_admin_user` cookie set during login. Returns null when the cookie
 * is missing or unreadable so callers can decide between rendering an
 * anonymous shell or redirecting to /login.
 */
export async function getCurrentAdminUser(): Promise<AdminUserDto | null> {
  const jar = await cookies();
  const raw = jar.get(ADMIN_USER_COOKIE)?.value;
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded) as AdminUserDto;
    return parsed;
  } catch {
    return null;
  }
}
