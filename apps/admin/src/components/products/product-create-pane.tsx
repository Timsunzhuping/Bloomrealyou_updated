'use client';

import type { CreateAdminProductInput } from '@custom-merch/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter, Link } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';
import { getApiBaseUrl } from '@/lib/api-base';

import { ProductForm } from './product-form';

export function ProductCreatePane(): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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
        <h1 className="text-2xl font-bold tracking-tight">{t('products.createHeading')}</h1>
        <p className="text-sm text-muted-foreground">{t('products.createSubtitle')}</p>
      </header>
      <ProductForm
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const res = await adminFetch(getApiBaseUrl(), '/admin/products', {
              method: 'POST',
              body: JSON.stringify(payload as CreateAdminProductInput),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const created = (await res.json()) as { id: string };
            router.replace(`/products/${created.id}`);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </section>
  );
}
