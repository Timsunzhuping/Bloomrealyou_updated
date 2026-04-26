'use client';

import {
  PRODUCT_CATEGORIES,
  type CreateQuoteItemInput,
  type ProductCategory,
} from '@custom-merch/shared';
import { Button, Input, Textarea } from '@custom-merch/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  rfqId: string;
  apiBaseUrl: string;
}

interface DraftItem {
  description: string;
  category: ProductCategory | '';
  quantity: string;
  unitPriceCents: string;
}

const blankItem = (): DraftItem => ({
  description: '',
  category: '',
  quantity: '',
  unitPriceCents: '',
});

export function CreateQuoteForm({ rfqId, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin.rfqs.createQuote');
  const router = useRouter();
  const [items, setItems] = React.useState<DraftItem[]>([blankItem()]);
  const [shipping, setShipping] = React.useState('');
  const [tax, setTax] = React.useState('');
  const [discount, setDiscount] = React.useState('');
  const [validUntil, setValidUntil] = React.useState('');
  const [terms, setTerms] = React.useState('');
  const [internalNotes, setInternalNotes] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savedNumber, setSavedNumber] = React.useState<string | null>(null);

  const updateItem = (idx: number, patch: Partial<DraftItem>): void => {
    setItems((curr) => curr.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };
  const removeItem = (idx: number): void => {
    setItems((curr) => (curr.length > 1 ? curr.filter((_, i) => i !== idx) : curr));
  };
  const addItem = (): void => setItems((curr) => [...curr, blankItem()]);

  const dollarsToCents = (s: string): number => Math.round(Number(s || 0) * 100);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSavedNumber(null);

    const cleanItems: CreateQuoteItemInput[] = items
      .filter((i) => i.description.trim().length > 0 && Number(i.quantity) > 0)
      .map((i) => ({
        description: i.description.trim(),
        category: i.category || undefined,
        quantity: Number(i.quantity),
        unitPriceMinor: dollarsToCents(i.unitPriceCents),
        ...(i.category ? { category: i.category as ProductCategory } : {}),
      }));

    if (cleanItems.length === 0) {
      setError(t('description'));
      return;
    }

    setSaving(true);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/rfqs/${rfqId}/quotes`, {
        method: 'POST',
        body: JSON.stringify({
          currency: 'USD',
          items: cleanItems,
          shippingMinor: dollarsToCents(shipping),
          taxMinor: dollarsToCents(tax),
          discountMinor: dollarsToCents(discount),
          ...(validUntil ? { validUntil: new Date(validUntil).toISOString() } : {}),
          ...(terms.trim() ? { termsText: terms.trim() } : {}),
          ...(internalNotes.trim() ? { internalNotes: internalNotes.trim() } : {}),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const quote = (await res.json()) as { quoteNumber: string };
      setSavedNumber(quote.quoteNumber);
      setItems([blankItem()]);
      setShipping('');
      setTax('');
      setDiscount('');
      setValidUntil('');
      setTerms('');
      setInternalNotes('');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <h3 className="text-lg font-semibold">{t('heading')}</h3>

      <div className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <Input
              placeholder={t('description')}
              value={item.description}
              onChange={(e) => updateItem(idx, { description: e.target.value })}
              maxLength={500}
            />
            <select
              className="rounded border border-input bg-background px-2 py-1 text-sm"
              value={item.category}
              onChange={(e) => updateItem(idx, { category: e.target.value as ProductCategory | '' })}
            >
              <option value="">{t('category')}</option>
              {PRODUCT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <Input
              placeholder={t('quantity')}
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateItem(idx, { quantity: e.target.value })}
            />
            <Input
              placeholder={t('unitPrice')}
              type="number"
              min={0}
              step={0.01}
              value={item.unitPriceCents}
              onChange={(e) => updateItem(idx, { unitPriceCents: e.target.value })}
            />
            <button
              type="button"
              onClick={() => removeItem(idx)}
              className="rounded border border-input px-2 text-sm text-muted-foreground hover:text-destructive"
              aria-label={t('removeItem')}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-sm font-medium text-primary hover:underline"
        >
          + {t('addItem')}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('shipping')}</span>
          <Input type="number" min={0} step={0.01} value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('tax')}</span>
          <Input type="number" min={0} step={0.01} value={tax} onChange={(e) => setTax(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('discount')}</span>
          <Input type="number" min={0} step={0.01} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('validUntil')}</span>
        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </label>

      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('terms')}</span>
        <Textarea rows={2} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={2000} />
      </label>

      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('internalNotes')}</span>
        <Textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} maxLength={2000} />
      </label>

      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {savedNumber && (
        <p className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-sm text-emerald-700">
          {t('saved')} ({savedNumber})
        </p>
      )}

      <Button type="submit" disabled={saving}>
        {saving ? t('saving') : t('submit')}
      </Button>
    </form>
  );
}
