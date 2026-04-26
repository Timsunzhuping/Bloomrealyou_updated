'use client';

import { RFQ_STATUSES, type RFQStatus } from '@custom-merch/shared';
import { Button } from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';

interface Props {
  rfqId: string;
  currentStatus: RFQStatus;
  apiBaseUrl: string;
}

export function StatusUpdateForm({ rfqId, currentStatus, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const tRfq = useTranslations('rfq');
  const router = useRouter();
  const [status, setStatus] = React.useState<RFQStatus>(currentStatus);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/rfqs/${rfqId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('rfqs.detail.status')}</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as RFQStatus)}
          className="rounded border border-input bg-background px-2 py-1 text-sm"
        >
          {RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tRfq(`statusLabels.${s}`)}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" size="sm" disabled={saving || status === currentStatus}>
        {t('rfqs.detail.saveStatus')}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </form>
  );
}
