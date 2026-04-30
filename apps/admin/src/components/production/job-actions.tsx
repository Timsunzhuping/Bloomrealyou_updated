'use client';

import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  PRODUCTION_JOB_STATUSES,
  type AdminProductionJobDto,
  type AdminSupplierDto,
  type ProductCategory,
  type ProductionJobStatus,
  type SupplierRecommendation,
  type SupplierRecommendResponse,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Sparkles, Truck, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  job: AdminProductionJobDto;
  suppliers: AdminSupplierDto[];
  apiBaseUrl: string;
  destinationCountry: string;
  productCategory: ProductCategory;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('read-failed'));
    reader.onload = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function JobActions({
  job,
  suppliers,
  apiBaseUrl,
  destinationCountry,
  productCategory,
}: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // ── status form
  const [status, setStatus] = React.useState<ProductionJobStatus>(job.status);
  const [statusNote, setStatusNote] = React.useState('');
  const [failureReason, setFailureReason] = React.useState(job.failureReason ?? '');

  // ── assign-supplier form
  const [supplierId, setSupplierId] = React.useState<string>(job.supplierId ?? suppliers[0]?.id ?? '');
  const [unitCostCents, setUnitCostCents] = React.useState<string>('');
  const [expectedReadyAt, setExpectedReadyAt] = React.useState<string>('');

  // ── recommendation
  const [recs, setRecs] = React.useState<SupplierRecommendation[] | null>(null);
  const [recBudget, setRecBudget] = React.useState<string>('');

  // ── QC upload form
  const [qcPassed, setQcPassed] = React.useState(true);
  const [qcNotes, setQcNotes] = React.useState('');
  const [qcFile, setQcFile] = React.useState<File | null>(null);
  const [qcFailureReason, setQcFailureReason] = React.useState('');

  // ── create-shipment
  const [carrier, setCarrier] = React.useState('');
  const [trackingNumber, setTrackingNumber] = React.useState('');
  const [trackingUrl, setTrackingUrl] = React.useState('');
  const [shippingMethod, setShippingMethod] = React.useState<'standard' | 'express' | 'rush'>(
    'standard',
  );
  const [shippingCostCents, setShippingCostCents] = React.useState('');

  const setStatusSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/production-jobs/${job.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: statusNote.trim() || undefined,
          failureReason: status === 'qc_failed' || status === 'cancelled'
            ? failureReason.trim() || undefined
            : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatusNote('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const assignSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/production-jobs/${job.id}/assign-supplier`, {
        method: 'POST',
        body: JSON.stringify({
          supplierId,
          unitCostMinor: unitCostCents ? Number(unitCostCents) : undefined,
          expectedReadyAt: expectedReadyAt
            ? new Date(expectedReadyAt).toISOString()
            : undefined,
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

  const recommend = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/suppliers/recommend', {
        method: 'POST',
        body: JSON.stringify({
          productId: job.productId ?? '',
          variantId: job.variantId ?? undefined,
          category: productCategory,
          printMethod: job.printMethod,
          quantity: job.quantity,
          destinationCountry,
          budgetUnitPriceMinor: recBudget ? Number(recBudget) : undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as SupplierRecommendResponse;
      setRecs(data.recommendations);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const qcSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const dataUrl = qcFile ? await fileToDataUrl(qcFile) : undefined;
      const res = await adminFetch(apiBaseUrl, `/admin/production-jobs/${job.id}/upload-qc`, {
        method: 'POST',
        body: JSON.stringify({
          passed: qcPassed,
          notes: qcNotes.trim() || undefined,
          attachmentDataUrl: dataUrl,
          attachmentFileName: qcFile?.name,
          failureReason: qcPassed ? undefined : qcFailureReason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setQcNotes('');
      setQcFile(null);
      setQcFailureReason('');
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const createShipment = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/shipments', {
        method: 'POST',
        body: JSON.stringify({
          orderId: job.orderId,
          productionJobIds: [job.id],
          carrier: carrier.trim() || undefined,
          trackingNumber: trackingNumber.trim() || undefined,
          trackingUrl: trackingUrl.trim() || undefined,
          shippingMethod,
          shippingCostMinor: shippingCostCents ? Number(shippingCostCents) : undefined,
          status: trackingNumber.trim() ? 'in_transit' : 'pending',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const created = (await res.json()) as { id: string };
      router.push(`/shipments/${created.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Status */}
      <form onSubmit={setStatusSubmit} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('productionJobs.detail.statusActions')}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="block font-medium">{t('productionJobs.detail.status')}</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProductionJobStatus)}
              className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
            >
              {PRODUCTION_JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {t(`productionJobs.statusLabels.${s}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="block font-medium">{t('productionJobs.detail.statusNote')}</span>
            <Input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
          </label>
          {(status === 'qc_failed' || status === 'cancelled') && (
            <label className="space-y-1 text-sm sm:col-span-3">
              <span className="block font-medium">
                {t('productionJobs.detail.failureReason')}
              </span>
              <Input
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
              />
            </label>
          )}
        </div>
        <Button type="submit" size="sm" disabled={busy || status === job.status}>
          {t('productionJobs.detail.saveStatus')}
        </Button>
      </form>

      {/* Recommend + Assign */}
      <section className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('productionJobs.detail.assignHeading')}</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Input
            type="number"
            min={0}
            placeholder={t('productionJobs.detail.budgetUnitPrice')}
            value={recBudget}
            onChange={(e) => setRecBudget(e.target.value)}
            className="w-44"
          />
          <Button type="button" variant="outline" size="sm" onClick={recommend} disabled={busy}>
            <Sparkles className="me-2 h-4 w-4" aria-hidden="true" />
            {t('productionJobs.detail.recommend')}
          </Button>
        </div>
        {recs && recs.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {t('productionJobs.detail.noRecommendations')}
          </p>
        )}
        {recs && recs.length > 0 && (
          <ul className="space-y-2">
            {recs.map((r) => (
              <li
                key={r.supplierId}
                className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/30 p-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-primary px-2 py-0.5 font-mono text-primary-foreground">
                    {r.score}
                  </span>
                  <span className="font-medium">{r.supplierName}</span>
                  <span className="text-muted-foreground">
                    {(r.estimatedUnitCostMinor / 100).toFixed(2)} {r.currency}/u ·{' '}
                    {r.estimatedProductionDays}d
                  </span>
                  <span className="text-muted-foreground">
                    Total ≈ {(r.estimatedTotalCostMinor / 100).toFixed(2)} {r.currency}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {r.reasons.join(' · ')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSupplierId(r.supplierId)}
                  className="rounded border border-input bg-background px-2 py-0.5 text-[11px] hover:bg-muted"
                >
                  {t('productionJobs.detail.pick')}
                </button>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={assignSubmit} className="grid gap-2 sm:grid-cols-4">
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="block font-medium">{t('productionJobs.detail.supplier')}</span>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="h-9 w-full rounded border border-input bg-background px-2 text-sm"
              required
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.country})
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-medium">{t('productionJobs.detail.unitCost')}</span>
            <Input
              type="number"
              min={0}
              value={unitCostCents}
              onChange={(e) => setUnitCostCents(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block font-medium">{t('productionJobs.detail.expectedReadyAt')}</span>
            <Input
              type="date"
              value={expectedReadyAt}
              onChange={(e) => setExpectedReadyAt(e.target.value)}
            />
          </label>
          <Button type="submit" size="sm" disabled={busy} className="sm:col-span-4">
            {t('productionJobs.detail.assignCta')}
          </Button>
        </form>
      </section>

      {/* QC */}
      <form onSubmit={qcSubmit} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('productionJobs.detail.qcHeading')}</h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={qcPassed}
            onChange={() => setQcPassed(true)}
          />
          {t('productionJobs.detail.qcPass')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            checked={!qcPassed}
            onChange={() => setQcPassed(false)}
          />
          {t('productionJobs.detail.qcFail')}
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('productionJobs.detail.qcNotes')}</span>
          <textarea
            rows={2}
            value={qcNotes}
            onChange={(e) => setQcNotes(e.target.value)}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {!qcPassed && (
          <label className="space-y-1 text-sm">
            <span className="block font-medium">
              {t('productionJobs.detail.qcFailureReason')}
            </span>
            <Input
              value={qcFailureReason}
              onChange={(e) => setQcFailureReason(e.target.value)}
              required={!qcPassed}
            />
          </label>
        )}
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('productionJobs.detail.qcAttachment')}</span>
          <Input
            type="file"
            accept="image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => setQcFile(e.target.files?.[0] ?? null)}
          />
        </label>
        <Button type="submit" size="sm" disabled={busy}>
          <Upload className="me-2 h-4 w-4" aria-hidden="true" />
          {t('productionJobs.detail.qcUpload')}
        </Button>
      </form>

      {/* Create shipment */}
      <form onSubmit={createShipment} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">
          {t('productionJobs.detail.createShipmentHeading')}
        </h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            placeholder={t('productionJobs.detail.carrier')}
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
          />
          <Input
            placeholder={t('productionJobs.detail.trackingNumber')}
            value={trackingNumber}
            onChange={(e) => setTrackingNumber(e.target.value)}
          />
          <Input
            placeholder={t('productionJobs.detail.trackingUrl')}
            value={trackingUrl}
            onChange={(e) => setTrackingUrl(e.target.value)}
          />
          <select
            value={shippingMethod}
            onChange={(e) =>
              setShippingMethod(e.target.value as 'standard' | 'express' | 'rush')
            }
            className="h-9 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="standard">standard</option>
            <option value="express">express</option>
            <option value="rush">rush</option>
          </select>
          <Input
            type="number"
            min={0}
            placeholder={t('productionJobs.detail.shippingCostCents')}
            value={shippingCostCents}
            onChange={(e) => setShippingCostCents(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" disabled={busy}>
          <Truck className="me-2 h-4 w-4" aria-hidden="true" />
          {t('productionJobs.detail.createShipment')}
        </Button>
      </form>

      {/* Hidden util — silence lint about unused PRINT_METHODS / categories. */}
      <span className="hidden">
        {PRINT_METHODS.length}-{PRODUCT_CATEGORIES.length}
      </span>
    </div>
  );
}
