import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { setRequestLocale } from 'next-intl/server';

import { AccountDesignsList } from '@/components/account/designs-list';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountDesignsPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  return <AccountDesignsList locale={locale} />;
}
