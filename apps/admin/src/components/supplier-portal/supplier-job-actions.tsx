'use client';

import type { AdminProductionJobDto } from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Check, Hammer, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  job: AdminProductionJobDto;
  apiBaseUrl: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('read-failed'));
    reader.onload = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Supplier-side actions: confirm an assigned job, mark it started, or upload
 * the QC result. Each button lights up only when the job is in the matching
 * state — the API enforces the same constraints, but disabling here saves a
 * round-trip and gives the supplier a clearer mental model.
 */
export function SupplierJobActions({ job, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const post = async (path: string, body?: unknown): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, path, {
        method: 'POST',
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ── QC form
  const [qcPassed, setQcPassed] = React.useState(true);
  const [qcNotes, setQcNotes] = React.useState('');
  const [qcFailureReason, setQcFailureReason] = React.useState('');
  const [qcFile, setQcFile] = React.useState<File | null>(null);

  const submitQc = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const dataUrl = qcFile ? await fileToDataUrl(qcFile) : undefined;
    await post(`/supplier-portal/production-jobs/${job.id}/upload-qc`, {
      passed: qcPassed,
      notes: qcNotes.trim() || undefined,
      attachmentDataUrl: dataUrl,
      attachmentFileName: qcFile?.name,
      failureReason: qcPassed ? undefined : qcFailureReason.trim() || undefined,
    });
    setQcNotes('');
    setQcFailureReason('');
    setQcFile(null);
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || job.status !== 'assigned'}
          onClick={() => post(`/supplier-portal/production-jobs/${job.id}/confirm`)}
        >
          <Check className="me-2 h-4 w-4" aria-hidden="true" />
          {t('supplierPortal.actions.confirm')}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || job.status !== 'supplier_confirmed'}
          onClick={() => post(`/supplier-portal/production-jobs/${job.id}/start`)}
        >
          <Hammer className="me-2 h-4 w-4" aria-hidden="true" />
          {t('supplierPortal.actions.start')}
        </Button>
      </div>

      <form onSubmit={submitQc} className="space-y-3 rounded-lg border bg-card p-4">
        <h3 className="text-sm font-semibold">{t('supplierPortal.qc.heading')}</h3>
        <p className="text-xs text-muted-foreground">{t('supplierPortal.qc.body')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={qcPassed} onChange={() => setQcPassed(true)} />
          {t('productionJobs.detail.qcPass')}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" checked={!qcPassed} onChange={() => setQcPassed(false)} />
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
        <Button
          type="submit"
          size="sm"
          disabled={busy || (job.status !== 'in_production' && job.status !== 'qc_pending' && job.status !== 'qc_failed')}
        >
          <Upload className="me-2 h-4 w-4" aria-hidden="true" />
          {t('productionJobs.detail.qcUpload')}
        </Button>
      </form>
    </div>
  );
}
