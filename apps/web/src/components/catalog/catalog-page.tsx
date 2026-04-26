'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import type { Product, ProductCategory } from '@custom-merch/shared';
import {
  Breadcrumb,
  Button,
  EmptyState,
  FAQSection,
  ProductBadge,
  ProductCard,
  ProductGrid,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';

import { CatalogFilters } from './catalog-filters';

export interface CatalogPageProps {
  locale: Locale;
  /** Products to render (already filtered server-side by category if applicable). */
  products: Product[];
  /** When set, render this category's intro / SEO blurb. */
  category?: ProductCategory;
  /** Localized breadcrumb / heading copy. */
  heading: string;
  subtitle: string;
}

const SORTS = {
  popular: (a: Product, b: Product) => a.slug.localeCompare(b.slug),
  priceAsc: (a: Product, b: Product) => a.basePrice.amountMinor - b.basePrice.amountMinor,
  priceDesc: (a: Product, b: Product) => b.basePrice.amountMinor - a.basePrice.amountMinor,
  newest: (a: Product, b: Product) => b.createdAt.localeCompare(a.createdAt),
} satisfies Record<string, (a: Product, b: Product) => number>;

export function CatalogPage({
  locale,
  products,
  category,
  heading,
  subtitle,
}: CatalogPageProps): JSX.Element {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const [sort, setSort] = React.useState<keyof typeof SORTS>('popular');

  const sorted = React.useMemo(() => [...products].sort(SORTS[sort]), [products, sort]);

  const breadcrumbs = [
    { label: t('detail.breadcrumbs.home'), href: '/' },
    { label: t('detail.breadcrumbs.products'), href: '/products' },
  ];
  if (category) {
    breadcrumbs.push({ label: t(`categories.${category}.name`), href: `/custom-${category}` });
  }

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb ariaLabel={tCommon('nav.home')} items={breadcrumbs} renderLink={(item, c) => (
        <Link href={item.href as string}>{c}</Link>
      )} />

      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{heading}</h1>
        <p className="max-w-2xl text-muted-foreground">{subtitle}</p>
        <p className="text-sm text-muted-foreground">
          {t('categoryPage.resultsCount', { count: sorted.length })}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <CatalogFilters
          scopedCategory={category}
          sort={sort}
          onSortChange={(v) => setSort(v as keyof typeof SORTS)}
        />

        <div className="space-y-6">
          {sorted.length === 0 ? (
            <EmptyState title={t('list.empty')} />
          ) : (
            <ProductGrid>
              {sorted.map((product) => {
                const name = product.name[locale] ?? product.name.en;
                const price = formatCurrency(product.basePrice, locale);
                return (
                  <Link key={product.id} href={`/products/${product.slug}`} className="contents">
                    <ProductCard
                      name={name}
                      priceLabel={price}
                      pricePrefix={t('detail.fromPrice')}
                      imageSrc={product.imageUrls[0]}
                      imageAlt={name}
                      badge={
                        product.tags.includes('organic') ? (
                          <ProductBadge label="Eco" variant="success" />
                        ) : product.tags.includes('heavyweight') ? (
                          <ProductBadge label="Premium" variant="accent" />
                        ) : null
                      }
                      footer={
                        <Button asChild size="sm" className="w-full">
                          <span>{t('categoryPage.primaryCta')}</span>
                        </Button>
                      }
                    />
                  </Link>
                );
              })}
            </ProductGrid>
          )}

          <div className="flex flex-wrap gap-3 pt-4">
            <Button asChild>
              <Link href="/customize/classic-cotton-tee">{t('categoryPage.primaryCta')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/business">{t('categoryPage.bulkQuoteCta')}</Link>
            </Button>
          </div>
        </div>
      </div>

      <FAQSection
        heading={t('categoryPage.faqHeading')}
        items={[
          { question: t('categoryPage.faqItems.q1'), answer: t('categoryPage.faqItems.a1') },
          { question: t('categoryPage.faqItems.q2'), answer: t('categoryPage.faqItems.a2') },
          { question: t('categoryPage.faqItems.q3'), answer: t('categoryPage.faqItems.a3') },
        ]}
      />
    </div>
  );
}
