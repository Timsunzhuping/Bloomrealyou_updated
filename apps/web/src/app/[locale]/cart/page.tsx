import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CartPageClient } from '@/components/cart/cart-page';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'cart' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      languages: {
        en: '/en/cart',
        'zh-CN': '/zh-CN/cart',
        es: '/es/cart',
        ar: '/ar/cart',
      },
    },
  };
}

export default async function CartPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  return <CartPageClient locale={locale} />;
}
