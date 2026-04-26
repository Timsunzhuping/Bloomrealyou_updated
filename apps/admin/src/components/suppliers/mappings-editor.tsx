'use client';

import {
  PRINT_METHODS,
  type AdminSupplierProductMappingDto,
  type PrintMethod,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  supplierId: string;
  initialMappings: AdminSupplierProductMappingDto[];
  apiBaseUrl: string;
}

export function MappingsEditor({ supplierId, initialMappings, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [mappings, setMappings] = React.useState(initialMappings);
  const [draft, setDraft] = React.useState({
    productId: '',
    variantId: '',
    supplierSku: '',
    costPriceCents: '',
    productionDays: '5',
    minOrderQuantity: '50',
    maxDailyCapacity: '200',
    printMethods: ['dtg'] as PrintMethod[],
    status: 'active' as 'active' | 'paused' | 'inactive',
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const togglePrint = (method: PrintMethod): void => {
    setDraft((prev) => ({
      ...prev,
      printMethods: prev.printMethods.includes(method)
        ? prev.printMethods.filter((m) => m !== method)
        : [...prev.printMethods, method],
    }));
  };

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/supplier-product-mappings', {
        method: 'POST',
        body: JSON.stringify({
          supplierId,
          productId: draft.productId,
          variantId: draft.variantId || undefined,
          supplierSku: draft.supplierSku,
          costPriceMinor: Number(draft.costPriceCents),
          productionDays: Number(draft.productionDays),
          minOrderQuantity: Number(draft.minOrderQuantity),
          maxDailyCapacity: Number(draft.maxDailyCapacity),
          printMethods: draft.printMethods,
          status: draft.status,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as AdminSupplierProductMappingDto;
      setMappings((prev) => [created, ...prev]);
      setDraft({
        productId: '',
        variantId: '',
        supplierSku: '',
        costPriceCents: '',
        productionDays: '5',
        minOrderQuantity: '50',
        maxDailyCapacity: '200',
        printMethods: ['dtg'],
        status: 'active',
      });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const updateStatus = async (
    id: string,
    status: 'active' | 'paused' | 'inactive',
  ): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/supplier-product-mappings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as AdminSupplierProductMappingDto;
      setMappings((prev) => prev.map((m) => (m.id === id ? updated : m)));
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('suppliers.mappings.heading')}</h3>
      {mappings.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('suppliers.mappings.empty')}</p>
      ) : (
        <ul className="divide-y rounded border bg-background">
          {mappings.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{m.supplierSku}</span>
                <span className="font-mono text-[11px] text-muted-foreground">{m.productId}</span>
                <span className="text-xs text-muted-foreground">
                  {(m.costPrice.amountMinor / 100).toFixed(2)} {m.costPrice.currency}
                </span>
                <span className="text-xs text-muted-foreground">{m.productionDays}d</span>
                <span className="text-xs text-muted-foreground">MOQ {m.minOrderQuantity}</span>
                <span className="text-xs text-muted-foreground">cap {m.maxDailyCapacity}/d</span>
                <span className="text-xs text-muted-foreground">{m.printMethods.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={m.status}
                  onChange={(e) =>
                    updateStatus(m.id, e.target.value as 'active' | 'paused' | 'inactive')
                  }
                  disabled={busy}
                  className="h-7 rounded border border-input bg-background px-2 text-xs"
                >
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                  <option value="inactive">inactive</option>
                </select>
                <button
                  type="button"
                  onClick={() => updateStatus(m.id, 'inactive')}
                  className="text-muted-foreground hover:text-destructive"
                  disabled={busy}
                  aria-label={t('suppliers.mappings.disable')}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="grid gap-2 rounded border bg-muted/30 p-3 sm:grid-cols-6">
        <input
          required
          placeholder={t('suppliers.mappings.productId')}
          value={draft.productId}
          onChange={(e) => setDraft({ ...draft, productId: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm sm:col-span-2"
        />
        <input
          placeholder={t('suppliers.mappings.variantId')}
          value={draft.variantId}
          onChange={(e) => setDraft({ ...draft, variantId: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm sm:col-span-2"
        />
        <input
          required
          placeholder={t('suppliers.mappings.sku')}
          value={draft.supplierSku}
          onChange={(e) => setDraft({ ...draft, supplierSku: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm sm:col-span-2"
        />
        <Input
          type="number"
          min={0}
          placeholder={t('suppliers.mappings.costPrice')}
          value={draft.costPriceCents}
          onChange={(e) => setDraft({ ...draft, costPriceCents: e.target.value })}
          required
        />
        <Input
          type="number"
          min={1}
          max={60}
          placeholder={t('suppliers.mappings.productionDays')}
          value={draft.productionDays}
          onChange={(e) => setDraft({ ...draft, productionDays: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder={t('suppliers.mappings.minOrderQuantity')}
          value={draft.minOrderQuantity}
          onChange={(e) => setDraft({ ...draft, minOrderQuantity: e.target.value })}
        />
        <Input
          type="number"
          min={1}
          placeholder={t('suppliers.mappings.maxDailyCapacity')}
          value={draft.maxDailyCapacity}
          onChange={(e) => setDraft({ ...draft, maxDailyCapacity: e.target.value })}
        />
        <div className="sm:col-span-2 flex flex-wrap gap-1">
          {PRINT_METHODS.map((m) => {
            const active = draft.printMethods.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => togglePrint(m)}
                className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        <Button type="submit" size="sm" disabled={busy} className="sm:col-span-6">
          {busy ? t('suppliers.mappings.saving') : t('suppliers.mappings.add')}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}
