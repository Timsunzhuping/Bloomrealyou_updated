import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { Customizer } from '@/components/customizer/customizer';
import { fetchProductBundle } from '@/lib/api';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; productSlug: string }>;
  searchParams: Promise<{ variant?: string; designId?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, productSlug } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const bundle = await fetchProductBundle(productSlug);
  if (!bundle) return {};
  const t = await getTranslations({ locale, namespace: 'customizer' });
  const localizedName = bundle.product.name[locale] ?? bundle.product.name.en;
  return {
    title: t('metaTitleTemplate', { name: localizedName }),
    description: bundle.product.description[locale] ?? bundle.product.description.en,
  };
}

export default async function CustomizePage(props: Props): Promise<JSX.Element> {
  const { locale: rawLocale, productSlug } = await props.params;
  const { variant, designId } = await props.searchParams;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const bundle = await fetchProductBundle(productSlug);
  if (!bundle) notFound();

  return (
    <Customizer
      locale={locale}
      product={bundle.product}
      variants={bundle.variants}
      printAreas={bundle.printAreas}
      initialVariantId={variant}
      initialDesignId={designId}
    />
  );
}
