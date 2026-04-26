'use client';

import type { Locale } from '@custom-merch/i18n';
import type { GiftSet } from '@custom-merch/shared';
import { Badge, Button, FormField, Input } from '@custom-merch/ui';
import { Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { getClientApi } from '@/lib/client-api';

interface Props {
  locale: Locale;
}

export function GiftSetSuggestionForm({ locale }: Props): JSX.Element {
  const t = useTranslations('customizer.ai');
  const [prompt, setPrompt] = React.useState('');
  const [audienceSize, setAudienceSize] = React.useState<string>('');
  const [budgetUsd, setBudgetUsd] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [sets, setSets] = React.useState<GiftSet[]>([]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (prompt.trim().length === 0) return;
    setLoading(true);
    setError(false);
    try {
      const result = await getClientApi().ai.giftSetSuggestions({
        prompt,
        locale,
        audienceSize: audienceSize ? Number(audienceSize) : undefined,
        budgetUsd: budgetUsd ? Number(budgetUsd) : undefined,
      });
      setSets(result.sets);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mx-auto max-w-2xl space-y-5 text-start">
      <header className="space-y-2 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-accent" aria-hidden="true" />
        <h2 className="text-xl font-bold tracking-tight">{t('panelTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('panelSubtitle')}</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border bg-card p-4">
        <FormField id="biz-prompt" label={t('scenarioLabel')} required>
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={t('scenarioPlaceholder')}
            maxLength={500}
            required
          />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="biz-audience" label="Audience size">
            <Input
              type="number"
              min={1}
              value={audienceSize}
              onChange={(e) => setAudienceSize(e.target.value)}
            />
          </FormField>
          <FormField id="biz-budget" label="Budget (USD per recipient)">
            <Input
              type="number"
              min={0}
              value={budgetUsd}
              onChange={(e) => setBudgetUsd(e.target.value)}
            />
          </FormField>
        </div>
        <Button type="submit" disabled={loading || prompt.trim().length === 0}>
          {loading ? t('generating') : t('generate')}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t('fallback')}
        </p>
      )}

      {sets.length > 0 && (
        <ul className="space-y-3">
          {sets.map((set, i) => (
            <li key={i} className="rounded-lg border bg-card p-4">
              <p className="text-base font-semibold">{set.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{set.reason}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {set.products.map((p) => (
                  <Badge key={p} variant="secondary">
                    {p}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
