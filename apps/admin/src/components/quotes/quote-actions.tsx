'use client';

import { QUOTE_STATUSES, type QuoteStatus } from '@custom-merch/shared';
import { Button, Input, Textarea } from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';

interface Props {
  quoteId: string;
  currentStatus: QuoteStatus;
  alreadyConverted: boolean;
  apiBaseUrl: string;
}

export function QuoteActions({
  quoteId,
  currentStatus,
  alreadyConverted,
  apiBaseUrl,
}: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();

  const [status, setStatus] = React.useState<QuoteStatus>(currentStatus);
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [statusError, setStatusError] = React.useState<string | null>(null);

  const [shipping, setShipping] = React.useState({
    fullName: '',
    company: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });
  const [shippingMethod, setShippingMethod] = React.useState<'standard' | 'express' | 'rush'>(
    'standard',
  );
  const [orderNotes, setOrderNotes] = React.useState('');
  const [converting, setConverting] = React.useState(false);
  const [convertError, setConvertError] = React.useState<string | null>(null);
  const [convertedNumber, setConvertedNumber] = React.useState<string | null>(null);

  const onSaveStatus = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSavingStatus(true);
    setStatusError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setSavingStatus(false);
    }
  };

  const onConvert = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setConvertError(null);
    setConvertedNumber(null);
    setConverting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/quotes/${quoteId}/convert-to-order`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shippingAddress: { ...shipping, country: shipping.country.toUpperCase() },
          shippingMethod,
          notes: orderNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const order = (await res.json()) as { orderNumber: string };
      setConvertedNumber(order.orderNumber);
      router.refresh();
    } catch (err) {
      setConvertError((err as Error).message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSaveStatus} className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('rfqs.detail.status')}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as QuoteStatus)}
            className="rounded border border-input bg-background px-2 py-1 text-sm"
            disabled={alreadyConverted}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`quotes.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="submit"
          size="sm"
          disabled={savingStatus || status === currentStatus || alreadyConverted}
        >
          {t('rfqs.detail.saveStatus')}
        </Button>
        {statusError && <span className="text-xs text-destructive">{statusError}</span>}
      </form>

      <form onSubmit={onConvert} className="space-y-4 rounded-lg border bg-muted/30 p-4">
        <h3 className="text-base font-semibold">{t('quotes.detail.convertHeading')}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder={t('quotes.detail.fullName')}
            value={shipping.fullName}
            onChange={(e) => setShipping({ ...shipping, fullName: e.target.value })}
            required
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.company')}
            value={shipping.company}
            onChange={(e) => setShipping({ ...shipping, company: e.target.value })}
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.line1')}
            value={shipping.line1}
            onChange={(e) => setShipping({ ...shipping, line1: e.target.value })}
            required
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.line2')}
            value={shipping.line2}
            onChange={(e) => setShipping({ ...shipping, line2: e.target.value })}
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.city')}
            value={shipping.city}
            onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
            required
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.state')}
            value={shipping.state}
            onChange={(e) => setShipping({ ...shipping, state: e.target.value })}
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.postalCode')}
            value={shipping.postalCode}
            onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
            required
            disabled={alreadyConverted}
          />
          <Input
            placeholder={t('quotes.detail.country')}
            value={shipping.country}
            onChange={(e) => setShipping({ ...shipping, country: e.target.value })}
            maxLength={2}
            minLength={2}
            required
            disabled={alreadyConverted}
          />
        </div>

        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('quotes.detail.shippingMethod')}</span>
          <select
            value={shippingMethod}
            onChange={(e) =>
              setShippingMethod(e.target.value as 'standard' | 'express' | 'rush')
            }
            className="rounded border border-input bg-background px-2 py-1 text-sm"
            disabled={alreadyConverted}
          >
            <option value="standard">standard</option>
            <option value="express">express</option>
            <option value="rush">rush</option>
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('quotes.detail.noteSentToOrder')}</span>
          <Textarea
            rows={2}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            disabled={alreadyConverted}
          />
        </label>

        {convertError && (
          <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
            {convertError}
          </p>
        )}
        {convertedNumber && (
          <p className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2 text-sm text-emerald-700">
            {t('quotes.detail.converted', { number: convertedNumber })}
          </p>
        )}

        <Button type="submit" disabled={converting || alreadyConverted}>
          {converting ? t('quotes.detail.converting') : t('quotes.detail.convertCta')}
        </Button>
      </form>
    </div>
  );
}
