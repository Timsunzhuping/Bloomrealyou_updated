import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isRtlLocale,
  type Locale,
} from '@custom-merch/shared';

/** Layout direction for the given locale (`'ltr'` or `'rtl'`). */
export type LayoutDirection = 'ltr' | 'rtl';

export function getLayoutDirection(locale: Locale): LayoutDirection {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

/**
 * Builds a locale-prefixed path. Idempotent: if `path` already starts with a
 * supported locale prefix, the existing prefix is replaced.
 *
 * @example
 *   getLocalizedPath('en', '/products')         // "/en/products"
 *   getLocalizedPath('zh-CN', '/zh-CN/cart')    // "/zh-CN/cart"  (idempotent)
 *   getLocalizedPath('ar', '/en/account')       // "/ar/account"  (locale swap)
 *   getLocalizedPath('en', '/')                 // "/en"
 */
export function getLocalizedPath(locale: Locale, path: string = '/'): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  // Strip leading locale segment if present.
  const segments = normalized.split('/').filter(Boolean);
  const head = segments[0];
  if (head && (SUPPORTED_LOCALES as readonly string[]).includes(head)) {
    segments.shift();
  }
  const remainder = segments.length > 0 ? `/${segments.join('/')}` : '';
  return `/${locale}${remainder}`;
}

/**
 * Returns the locale prefix found at the start of `pathname`, or the default
 * when no recognised locale segment is present.
 */
export function detectLocaleFromPath(pathname: string): Locale {
  const segments = pathname.split('/').filter(Boolean);
  const head = segments[0];
  if (head && (SUPPORTED_LOCALES as readonly string[]).includes(head)) {
    return head as Locale;
  }
  return DEFAULT_LOCALE;
}
