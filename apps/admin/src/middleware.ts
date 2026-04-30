import { SUPPORTED_LOCALES } from '@custom-merch/i18n';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';

import { ADMIN_TOKEN_COOKIE } from './lib/auth-cookies';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/** Public paths inside `/{locale}/...` that bypass the auth gate. */
const PUBLIC_PAGES = new Set(['/login']);

function pickLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0];
  return seg && (SUPPORTED_LOCALES as readonly string[]).includes(seg) ? seg : routing.defaultLocale;
}

function stripLocale(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0];
  if (seg && (SUPPORTED_LOCALES as readonly string[]).includes(seg)) {
    return pathname.slice(`/${seg}`.length) || '/';
  }
  return pathname;
}

/**
 * Composed middleware: auth-gate first, then locale resolution. Anonymous
 * requests for any non-public route are redirected to `/{locale}/login`,
 * preserving the original `pathname` as `?next=...`.
 */
export default function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const locale = pickLocale(pathname);
  const inner = stripLocale(pathname);

  const hasToken = Boolean(req.cookies.get(ADMIN_TOKEN_COOKIE)?.value);
  const isPublic = PUBLIC_PAGES.has(inner);

  if (!hasToken && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    if (pathname !== `/${locale}` && pathname !== `/${locale}/`) {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  // If the user is signed in and visiting /login, push them straight to the dashboard.
  if (hasToken && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
