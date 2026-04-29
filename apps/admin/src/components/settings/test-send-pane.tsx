'use client';

import { SUPPORTED_LOCALES, type Locale } from '@custom-merch/i18n';
import type { AdminNotificationTemplate, AdminTestSendResult } from '@custom-merch/sdk';
import { Button, Input } from '@custom-merch/ui';
import { Send } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { adminFetch } from '@/lib/admin-fetch';

interface Props {
  templates: AdminNotificationTemplate[];
  apiBaseUrl: string;
}

/**
 * Admin "send a test email" widget.
 *
 * Picks a template + locale, dispatches via the active NotificationProvider,
 * and previews what was sent (subject + plain-text body) in-place. Surfaces
 * the active provider name so the admin can verify config without poking
 * around in environment variables.
 */
export function TestSendPane({ templates, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin.settings.notifications');
  const [to, setTo] = React.useState('');
  const [templateKey, setTemplateKey] = React.useState(templates[0]?.key ?? 'test.echo');
  const [locale, setLocale] = React.useState<Locale>('en');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AdminTestSendResult | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/notifications/test', {
        method: 'POST',
        body: JSON.stringify({ to: to.trim(), templateKey, locale }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      setResult((await res.json()) as AdminTestSendResult);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t('templatesEmpty')}</p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="block font-medium">{t('to')}</span>
          <Input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="block font-medium">{t('locale')}</span>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {SUPPORTED_LOCALES.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:col-span-3">
          <span className="block font-medium">{t('template')}</span>
          <select
            value={templateKey}
            onChange={(e) => setTemplateKey(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {templates.map((tpl) => (
              <option key={tpl.key} value={tpl.key}>
                {tpl.key} — {tpl.enSubject}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Button type="submit" size="sm" disabled={busy || !to}>
        <Send className="me-2 h-4 w-4" aria-hidden="true" />
        {busy ? t('sending') : t('sendTest')}
      </Button>

      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-3 rounded border bg-muted/30 p-3 text-sm">
          <p className="text-xs">
            <span className="font-medium">{t('provider')}:</span>{' '}
            {result.providerName}
            {result.result.simulated && ` (${t('simulated')})`}
            {' · '}
            <span className="font-mono text-muted-foreground">{result.result.id}</span>
          </p>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('subjectPreview')}
            </p>
            <p className="font-medium">{result.preview.subject}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t('bodyPreview')}
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs text-foreground">
              {result.preview.text}
            </pre>
          </div>
        </div>
      )}
    </form>
  );
}
