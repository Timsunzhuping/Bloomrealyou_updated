import { getMessages, isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

import type { AbstractIntlMessages } from 'next-intl';

/**
 * next-intl request config. Resolves the locale from the URL segment and
 * loads the merged message bag from `@custom-merch/i18n`.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isSupportedLocale(requested) ? requested : routing.defaultLocale;

  // Cast: our Messages interface is structurally compatible with
  // AbstractIntlMessages (nested string maps) but lacks an index signature.
  return {
    locale,
    messages: getMessages(locale) as unknown as AbstractIntlMessages,
  };
});
