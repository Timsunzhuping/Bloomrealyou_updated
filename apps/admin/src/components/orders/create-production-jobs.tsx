'use client';

import type { AdminOrderSummary } from '@custom-merch/sdk';
import {
  PRINT_METHODS,
  type AdminProductionJobDto,
  type PrintMethod,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Hammer } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  order: AdminOrderSummary;
  apiBaseUrl: string;
}

/**
 * Lets the admin spawn a production job from a single order line. We default
 * the print method to the line's existing `printMethod` when present so the
 * common case ("design approved → kick off production") is one click + submit.
 */
export function CreateProductionJobs({ order, apiBaseUrl }: Props): JSX.Element | null {
  const t = useTranslations('admin');
  const router = useRouter();

  const [selected, setSelected] = React.useState<string[]>(
    order.items[0] ? [order.items[0].id] : [],
  );
  const [printMethod, setPrintMethod] = React.useState<PrintMethod>(
    (order.items[0]?.printMethod as PrintMethod | null) ?? 'dtg',
  );
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [created, setCreated] = React.useState<AdminProductionJobDto | null>(null);

  if (order.items.length === 0) return null;

  const toggle = (id: string): void => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const items = order.items.filter((i) => selected.includes(i.id));
      const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
      const res = await adminFetch(apiBaseUrl, '/admin/production-jobs', {
        method: 'POST',
        body: JSON.stringify({
          orderId: order.id,
          orderItemIds: items.map((i) => i.id),
          printMethod,
          quantity: totalQty,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const job = (await res.json()) as AdminProductionJobDto;
      setCreated(job);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">
        {t('productionJobs.createFromOrder.heading')}
      </h3>
      <p className="text-xs text-muted-foreground">
        {t('productionJobs.createFromOrder.body')}
      </p>

      <ul className="space-y-1 rounded border bg-background p-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
            />
            <span className="font-mono text-xs">{item.variantSkuSnapshot}</span>
            <span>{item.productNameSnapshot}</span>
            <span className="text-xs text-muted-foreground">×{item.quantity}</span>
          </li>
        ))}
      </ul>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">
            {t('productionJobs.createFromOrder.printMethod')}
          </span>
          <select
            value={printMethod}
            onChange={(e) => setPrintMethod(e.target.value as PrintMethod)}
            className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
          >
            {PRINT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="block font-medium">
            {t('productionJobs.createFromOrder.totalQty')}
          </span>
          <Input
            type="number"
            value={order.items
              .filter((i) => selected.includes(i.id))
              .reduce((sum, i) => sum + i.quantity, 0)}
            disabled
          />
        </label>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      {created && (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-xs text-emerald-700">
          {t('productionJobs.createFromOrder.created', { jobNumber: created.jobNumber })}
        </p>
      )}

      <Button type="submit" size="sm" disabled={busy || selected.length === 0}>
        <Hammer className="me-2 h-4 w-4" aria-hidden="true" />
        {busy ? t('productionJobs.createFromOrder.busy') : t('productionJobs.createFromOrder.cta')}
      </Button>
    </form>
  );
}
