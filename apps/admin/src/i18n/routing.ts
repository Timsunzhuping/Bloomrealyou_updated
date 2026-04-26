import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@custom-merch/i18n';
import { defineRouting } from 'next-intl/routing';

/** Admin routing — same locale set as the storefront. */
export const routing = defineRouting({
  locales: [...SUPPORTED_LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'always',
});
