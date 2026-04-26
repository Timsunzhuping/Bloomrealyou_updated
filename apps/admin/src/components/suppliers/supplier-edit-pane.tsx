'use client';

import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  UpdateAdminSupplierInput,
} from '@custom-merch/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

import { MappingsEditor } from './mappings-editor';
import { SupplierForm } from './supplier-form';

interface Props {
  supplier: AdminSupplierDto;
  mappings: AdminSupplierProductMappingDto[];
  apiBaseUrl: string;
}

export function SupplierEditPane({ supplier, mappings, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onDelete = async (): Promise<void> => {
    if (!window.confirm(t('suppliers.delete.confirm'))) return;
    setBusy(true);
    try {
      await adminFetch(apiBaseUrl, `/admin/suppliers/${supplier.id}`, { method: 'DELETE' });
      router.replace('/suppliers');
    } finally {
      setBusy(false);
    }
  };

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
        <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
        <p className="text-xs text-muted-foreground">
          {supplier.country} · {supplier.contactEmail}
        </p>
      </header>
      <SupplierForm
        initial={supplier}
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const res = await adminFetch(apiBaseUrl, `/admin/suppliers/${supplier.id}`, {
              method: 'PATCH',
              body: JSON.stringify(payload as UpdateAdminSupplierInput),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setSubmitting(false);
          }
        }}
      />

      <MappingsEditor
        supplierId={supplier.id}
        initialMappings={mappings}
        apiBaseUrl={apiBaseUrl}
      />

      <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-semibold text-destructive">{t('suppliers.delete.heading')}</h3>
        <p className="text-xs text-muted-foreground">{t('suppliers.delete.body')}</p>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded border border-destructive bg-background px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
        >
          {busy ? t('suppliers.delete.busy') : t('suppliers.delete.cta')}
        </button>
      </section>
    </section>
  );
}
