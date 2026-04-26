import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { ProductDetail } from '@/components/catalog/product-detail';
import { fetchProductBundle } from '@/lib/api';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const bundle = await fetchProductBundle(slug);
  if (!bundle) return {};
  const t = await getTranslations({ locale, namespace: 'products.detail' });
  const localizedName = bundle.product.name[locale] ?? bundle.product.name.en;
  return {
    title: t('metaTitleTemplate', { name: localizedName }),
    description: bundle.product.description[locale] ?? bundle.product.description.en,
    alternates: {
      languages: {
        en: `/en/products/${slug}`,
        'zh-CN': `/zh-CN/products/${slug}`,
        es: `/es/products/${slug}`,
        ar: `/ar/products/${slug}`,
      },
    },
  };
}

export default async function ProductDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, slug } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const bundle = await fetchProductBundle(slug);
  if (!bundle) notFound();

  return (
    <ProductDetail
      locale={locale}
      product={bundle.product}
      variants={bundle.variants}
      printAreas={bundle.printAreas}
      priceTiers={bundle.priceTiers}
    />
  );
}
