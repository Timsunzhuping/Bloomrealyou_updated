import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CheckoutPage } from '@/components/checkout/checkout-page';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'checkout' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function CheckoutRoutePage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  return <CheckoutPage locale={locale} />;
}
