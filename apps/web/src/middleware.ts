import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Locale-detecting middleware. Rewrites `/`, `/<route>`, etc. into a
 * locale-prefixed path so every page is reachable as `/{en|zh-CN|es|ar}/…`.
 */
export default createMiddleware(routing);

export const config = {
  // Match every path except Next.js internals and static assets.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
