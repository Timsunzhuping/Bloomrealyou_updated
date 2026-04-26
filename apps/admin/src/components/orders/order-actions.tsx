'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ORDER_STATUSES, type OrderStatus } from '@custom-merch/shared';
import type { AdminOrderSummary } from '@custom-merch/sdk';
import { Button } from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  note: z.string().max(2000).optional(),
  flagException: z.boolean().optional(),
});
type StatusFormValues = z.infer<typeof statusSchema>;

const noteSchema = z.object({
  body: z.string().min(1).max(2000),
});
type NoteFormValues = z.infer<typeof noteSchema>;

interface Props {
  order: AdminOrderSummary;
  apiBaseUrl: string;
}

export function OrderActions({ order, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();

  const statusForm = useForm<StatusFormValues>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: order.status,
      note: '',
      flagException: order.isFlaggedException,
    },
  });
  const noteForm = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { body: '' },
  });

  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [noteError, setNoteError] = React.useState<string | null>(null);

  const onStatusSubmit = statusForm.handleSubmit(async (values) => {
    setStatusError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      statusForm.reset({ ...values, note: '' });
      router.refresh();
    } catch (e) {
      setStatusError((e as Error).message);
    }
  });

  const onNoteSubmit = noteForm.handleSubmit(async (values) => {
    setNoteError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/orders/${order.id}/notes`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      noteForm.reset({ body: '' });
      router.refresh();
    } catch (e) {
      setNoteError((e as Error).message);
    }
  });

  return (
    <div className="space-y-6">
      <form onSubmit={onStatusSubmit} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('orders.detail.statusActions')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="block font-medium">{t('orders.detail.status')}</span>
            <select
              {...statusForm.register('status')}
              className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
            >
              {ORDER_STATUSES.map((s: OrderStatus) => (
                <option key={s} value={s}>
                  {t(`orders.statusLabels.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="block font-medium">{t('orders.detail.statusNote')}</span>
            <input
              {...statusForm.register('note')}
              placeholder={t('orders.detail.statusNotePlaceholder')}
              className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" {...statusForm.register('flagException')} />
          {t('orders.detail.flagException')}
        </label>
        {statusError && <p className="text-xs text-destructive">{statusError}</p>}
        <Button type="submit" size="sm" disabled={statusForm.formState.isSubmitting}>
          {statusForm.formState.isSubmitting ? t('orders.detail.saving') : t('orders.detail.saveStatus')}
        </Button>
      </form>

      <form onSubmit={onNoteSubmit} className="space-y-2 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('orders.detail.addNote')}</h3>
        <textarea
          {...noteForm.register('body')}
          rows={3}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t('orders.detail.notePlaceholder')}
        />
        {noteForm.formState.errors.body?.message && (
          <p className="text-xs text-destructive">
            {noteForm.formState.errors.body.message}
          </p>
        )}
        {noteError && <p className="text-xs text-destructive">{noteError}</p>}
        <Button type="submit" size="sm" disabled={noteForm.formState.isSubmitting}>
          {noteForm.formState.isSubmitting ? t('orders.detail.saving') : t('orders.detail.appendNote')}
        </Button>
      </form>
    </div>
  );
}
