'use client';

import type { AdminTemplateDto, UpdateAdminTemplateInput } from '@custom-merch/shared';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

import { TemplateForm } from './template-form';

interface Props {
  template: AdminTemplateDto;
  apiBaseUrl: string;
}

export function TemplateEditPane({ template, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const onDelete = async (): Promise<void> => {
    if (!window.confirm(t('templates.delete.confirm'))) return;
    setBusy(true);
    try {
      await adminFetch(apiBaseUrl, `/admin/templates/${template.id}`, { method: 'DELETE' });
      router.replace('/templates');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-6">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('templates.actions.backToList')}
      </Link>
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {template.name.en}
        </h1>
      </header>
      <TemplateForm
        initial={template}
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (payload) => {
          setSubmitting(true);
          setError(null);
          try {
            const res = await adminFetch(apiBaseUrl, `/admin/templates/${template.id}`, {
              method: 'PATCH',
              body: JSON.stringify(payload as UpdateAdminTemplateInput),
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
      <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
        <h3 className="text-sm font-semibold text-destructive">
          {t('templates.delete.heading')}
        </h3>
        <p className="text-xs text-muted-foreground">{t('templates.delete.body')}</p>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="rounded border border-destructive bg-background px-3 py-1 text-sm font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50"
        >
          {busy ? t('templates.delete.busy') : t('templates.delete.cta')}
        </button>
      </section>
    </section>
  );
}
