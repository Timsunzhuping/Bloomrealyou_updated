/** Cookie names — kept in one place so the middleware, server pages and the
 * client-side helper agree. Both cookies are JS-readable on purpose: the MVP
 * does not yet need HttpOnly and we want server components to read them via
 * `cookies()` and client code to clear them on logout. Set `Secure` and
 * `SameSite=Lax` defaults for production. */
export const ADMIN_TOKEN_COOKIE = 'cmp_admin_token';
export const ADMIN_USER_COOKIE = 'cmp_admin_user';
export const ADMIN_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
