import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { ProductCategory } from '@custom-merch/shared';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CatalogPage } from '@/components/catalog/catalog-page';
import { fetchProducts } from '@/lib/api';

import type { Metadata } from 'next';

/** Path segment for each category (matches the URL design in WP-05). */
const CATEGORY_PATH: Record<ProductCategory, string> = {
  't-shirts': 'custom-t-shirts',
  hoodies: 'custom-hoodies',
  mugs: 'custom-mugs',
  hats: 'custom-hats',
  'tote-bags': 'custom-tote-bags',
  stickers: 'custom-stickers',
};

export interface CategoryPageProps {
  params: Promise<{ locale: string }>;
}

/** Build a Next.js `generateMetadata` function for a given category route. */
export function buildCategoryMetadata(category: ProductCategory) {
  return async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { locale } = await params;
    if (!isSupportedLocale(locale)) return {};
    const t = await getTranslations({ locale, namespace: `products.categories.${category}` });
    const path = `/${CATEGORY_PATH[category]}`;
    return {
      title: t('metaTitle'),
      description: t('metaDescription'),
      alternates: {
        languages: {
          en: `/en${path}`,
          'zh-CN': `/zh-CN${path}`,
          es: `/es${path}`,
          ar: `/ar${path}`,
        },
      },
    };
  };
}

/** Build the page component itself. */
export function buildCategoryPage(category: ProductCategory) {
  return async function CategoryPage({ params }: CategoryPageProps): Promise<JSX.Element> {
    const { locale: rawLocale } = await params;
    const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
    setRequestLocale(locale);

    const t = await getTranslations({ locale, namespace: `products.categories.${category}` });
    const { items } = await fetchProducts({ category, pageSize: 60 });

    return (
      <CatalogPage
        locale={locale}
        products={items}
        category={category}
        heading={t('name')}
        subtitle={t('seoBlurb')}
      />
    );
  };
}
