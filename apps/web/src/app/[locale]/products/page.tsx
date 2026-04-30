import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CatalogPage } from '@/components/catalog/catalog-page';
import { fetchProducts } from '@/lib/api';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'products.list' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      languages: {
        en: '/en/products',
        'zh-CN': '/zh-CN/products',
        es: '/es/products',
        ar: '/ar/products',
      },
    },
  };
}

export default async function AllProductsPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'products' });
  const { items } = await fetchProducts({ pageSize: 60 });

  return (
    <CatalogPage
      locale={locale}
      products={items}
      heading={t('list.title')}
      subtitle={t('list.subtitle')}
    />
  );
}
