'use client';

import type { CreateAdminSupplierInput } from '@custom-merch/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';
import { getApiBaseUrl } from '@/lib/api-base';

import { SupplierForm } from './supplier-form';

export function SupplierCreatePane(): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <section className="space-y-6">
      <Link
        href="/suppliers"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('suppliers.actions.backToList')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t('suppliers.createHeading')}</h1>
        <p className="text-sm text-muted-foreground">{t('suppliers.createSubtitle')}</p>
      </header>
      <SupplierForm
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const res = await adminFetch(getApiBaseUrl(), '/admin/suppliers', {
              method: 'POST',
              body: JSON.stringify(payload as CreateAdminSupplierInput),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const created = (await res.json()) as { id: string };
            router.replace(`/suppliers/${created.id}`);
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
