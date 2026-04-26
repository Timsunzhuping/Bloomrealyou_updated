import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { setRequestLocale } from 'next-intl/server';

import { AccountOrderDetail } from '@/components/account/order-detail';

interface Props {
  params: Promise<{ locale: string; orderNumber: string }>;
}

export default async function AccountOrderDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, orderNumber } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  return <AccountOrderDetail locale={locale} orderNumber={orderNumber} />;
}
