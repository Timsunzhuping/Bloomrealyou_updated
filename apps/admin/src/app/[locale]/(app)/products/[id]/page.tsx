import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminProductDto } from '@custom-merch/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@custom-merch/ui';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ProductDetailEditor } from '@/components/products/product-detail-editor';
import { Link } from '@/i18n/navigation';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function ProductDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let product: AdminProductDto;
  try {
    const api = await getAdminApi();
    product = await api.adminProducts.get(id);
  } catch {
    notFound();
  }

  const apiBaseUrl = getApiBaseUrl();

  return (
    <section className="space-y-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('products.actions.backToList')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {product.name[locale] ?? product.name.en}
        </h1>
        <p className="font-mono text-xs text-muted-foreground">{product.slug}</p>
      </header>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('products.editHeading')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductDetailEditor product={product} apiBaseUrl={apiBaseUrl} />
        </CardContent>
      </Card>
    </section>
  );
}
