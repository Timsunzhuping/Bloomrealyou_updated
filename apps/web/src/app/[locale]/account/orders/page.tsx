import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { setRequestLocale } from 'next-intl/server';

import { AccountOrdersList } from '@/components/account/orders-list';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountOrdersPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  return <AccountOrdersList locale={locale} />;
}
