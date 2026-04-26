'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type {
  AdminDesignReviewDto,
  ApproveDesignInput,
  RejectDesignInput,
  RequestRevisionInput,
} from '@custom-merch/shared';
import { Button } from '@custom-merch/ui';
import { Check, MessageSquare, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  design: AdminDesignReviewDto;
  apiBaseUrl: string;
}

const approveSchema = z.object({ note: z.string().max(2000).optional() });
const rejectSchema = z.object({
  reason: z.string().min(1).max(2000),
  note: z.string().max(2000).optional(),
});
const revisionSchema = z.object({
  message: z.string().min(1).max(2000),
  note: z.string().max(2000).optional(),
});

type ApproveValues = z.infer<typeof approveSchema>;
type RejectValues = z.infer<typeof rejectSchema>;
type RevisionValues = z.infer<typeof revisionSchema>;

export function ReviewActions({ design, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin.designReviews');
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<'approve' | 'reject' | 'revision'>('approve');
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const isFinalised = design.status === 'approved' || design.status === 'rejected';

  const approveForm = useForm<ApproveValues>({ resolver: zodResolver(approveSchema), defaultValues: { note: '' } });
  const rejectForm = useForm<RejectValues>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: '', note: '' } });
  const revisionForm = useForm<RevisionValues>({ resolver: zodResolver(revisionSchema), defaultValues: { message: '', note: '' } });

  const post = async (path: string, body: unknown): Promise<void> => {
    const res = await adminFetch(apiBaseUrl, path, { method: 'POST', body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    router.refresh();
  };

  const submitApprove = approveForm.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await post(`/admin/design-reviews/${design.id}/approve`, values as ApproveDesignInput);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  const submitReject = rejectForm.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await post(`/admin/design-reviews/${design.id}/reject`, values as RejectDesignInput);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });
  const submitRevision = revisionForm.handleSubmit(async (values) => {
    setBusy(true);
    setError(null);
    try {
      await post(`/admin/design-reviews/${design.id}/request-revision`, values as RequestRevisionInput);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  });

  if (isFinalised) {
    return (
      <p className="rounded border bg-muted/30 p-3 text-sm text-muted-foreground">
        {t('finalised')}
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-wrap gap-1 border-b pb-2">
        <TabButton active={activeTab === 'approve'} onClick={() => setActiveTab('approve')}>
          <Check className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('actions.approve')}
        </TabButton>
        <TabButton active={activeTab === 'reject'} onClick={() => setActiveTab('reject')}>
          <X className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('actions.reject')}
        </TabButton>
        <TabButton active={activeTab === 'revision'} onClick={() => setActiveTab('revision')}>
          <MessageSquare className="me-1 h-3.5 w-3.5" aria-hidden="true" />
          {t('actions.requestRevision')}
        </TabButton>
      </div>

      {activeTab === 'approve' && (
        <form onSubmit={submitApprove} className="space-y-2 text-sm">
          <label className="space-y-1">
            <span className="block font-medium">{t('approve.note')}</span>
            <textarea
              {...approveForm.register('note')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? t('busy') : t('actions.approve')}
          </Button>
        </form>
      )}

      {activeTab === 'reject' && (
        <form onSubmit={submitReject} className="space-y-2 text-sm">
          <label className="space-y-1">
            <span className="block font-medium">{t('reject.reason')} *</span>
            <textarea
              {...rejectForm.register('reason')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {rejectForm.formState.errors.reason?.message && (
              <span className="text-xs text-destructive">
                {rejectForm.formState.errors.reason.message}
              </span>
            )}
          </label>
          <label className="space-y-1">
            <span className="block font-medium">{t('reject.note')}</span>
            <textarea
              {...rejectForm.register('note')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" size="sm" variant="destructive" disabled={busy}>
            {busy ? t('busy') : t('actions.reject')}
          </Button>
        </form>
      )}

      {activeTab === 'revision' && (
        <form onSubmit={submitRevision} className="space-y-2 text-sm">
          <label className="space-y-1">
            <span className="block font-medium">{t('revision.message')} *</span>
            <textarea
              {...revisionForm.register('message')}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {revisionForm.formState.errors.message?.message && (
              <span className="text-xs text-destructive">
                {revisionForm.formState.errors.message.message}
              </span>
            )}
          </label>
          <label className="space-y-1">
            <span className="block font-medium">{t('revision.note')}</span>
            <textarea
              {...revisionForm.register('note')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? t('busy') : t('actions.requestRevision')}
          </Button>
        </form>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
      }`}
    >
      {children}
    </button>
  );
}
