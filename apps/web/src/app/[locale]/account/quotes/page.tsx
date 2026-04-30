import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { setRequestLocale } from 'next-intl/server';

import { AccountQuotesList } from '@/components/account/quotes-list';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountQuotesPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  return <AccountQuotesList locale={locale} />;
}
