'use client';

import { SHIPMENT_STATUSES, type AdminShipmentDto, type ShipmentStatus } from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  shipment: AdminShipmentDto;
  apiBaseUrl: string;
}

export function ShipmentEditForm({ shipment, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();

  const [carrier, setCarrier] = React.useState(shipment.carrier ?? '');
  const [trackingNumber, setTrackingNumber] = React.useState(shipment.trackingNumber ?? '');
  const [trackingUrl, setTrackingUrl] = React.useState(shipment.trackingUrl ?? '');
  const [shippingMethod, setShippingMethod] = React.useState<'standard' | 'express' | 'rush'>(
    shipment.shippingMethod ?? 'standard',
  );
  const [shippingCostCents, setShippingCostCents] = React.useState(
    shipment.shippingCost ? String(shipment.shippingCost.amountMinor) : '',
  );
  const [estimatedDeliveryAt, setEstimatedDeliveryAt] = React.useState(
    shipment.estimatedDeliveryAt ? shipment.estimatedDeliveryAt.slice(0, 10) : '',
  );
  const [status, setStatus] = React.useState<ShipmentStatus>(shipment.status);
  const [notes, setNotes] = React.useState(shipment.notes ?? '');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/shipments/${shipment.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          carrier: carrier.trim() || null,
          trackingNumber: trackingNumber.trim() || null,
          trackingUrl: trackingUrl.trim() || null,
          shippingMethod,
          shippingCostMinor: shippingCostCents ? Number(shippingCostCents) : undefined,
          estimatedDeliveryAt: estimatedDeliveryAt
            ? new Date(estimatedDeliveryAt).toISOString()
            : null,
          status,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('shipments.detail.editHeading')}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t('shipments.detail.carrier')}>
          <Input value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </Field>
        <Field label={t('shipments.detail.trackingNumber')}>
          <Input
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
        </Field>
        <Field label={t('shipments.detail.trackingUrl')}>
          <Input value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
        </Field>
        <Field label={t('shipments.detail.shippingMethod')}>
          <select
            value={shippingMethod}
            onChange={(e) =>
              setShippingMethod(e.target.value as 'standard' | 'express' | 'rush')
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="standard">standard</option>
            <option value="express">express</option>
            <option value="rush">rush</option>
          </select>
        </Field>
        <Field label={t('shipments.detail.shippingCostCents')}>
          <Input
            type="number"
            min={0}
            value={shippingCostCents}
            onChange={(e) => setShippingCostCents(e.target.value)}
          />
        </Field>
        <Field label={t('shipments.detail.estimatedDeliveryAt')}>
          <Input
            type="date"
            value={estimatedDeliveryAt}
            onChange={(e) => setEstimatedDeliveryAt(e.target.value)}
          />
        </Field>
        <Field label={t('shipments.detail.status')}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ShipmentStatus)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`shipments.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t('shipments.detail.notes')}>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>
      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? t('shipments.detail.saving') : t('shipments.detail.save')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !shipment.trackingNumber}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              const res = await adminFetch(
                apiBaseUrl,
                `/admin/shipments/${shipment.id}/sync-tracking`,
                { method: 'POST' },
              );
              if (!res.ok) throw new Error(`HTTP ${res.status}`);
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <RefreshCw className="me-2 h-4 w-4" aria-hidden="true" />
          {t('shipments.detail.syncTracking')}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="space-y-1 text-sm">
      <span className="block font-medium">{label}</span>
      {children}
    </label>
  );
}
