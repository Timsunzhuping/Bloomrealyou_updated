import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@custom-merch/i18n';
import { defineRouting } from 'next-intl/routing';

/**
 * Storefront routing definition. `localePrefix: 'always'` produces URLs of the
 * shape `/<locale>/...` for every supported locale, including the default.
 */
export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
