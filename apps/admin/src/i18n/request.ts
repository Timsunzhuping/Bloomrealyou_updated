import { getMessages, isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getRequestConfig } from 'next-intl/server';

import { routing } from './routing';

import type { AbstractIntlMessages } from 'next-intl';

/** next-intl request config for the admin app. Mirrors apps/web. */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale: Locale = isSupportedLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: getMessages(locale) as unknown as AbstractIntlMessages,
  };
});
