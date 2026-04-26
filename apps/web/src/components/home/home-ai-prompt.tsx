'use client';

import { Button, Input } from '@custom-merch/ui';
import { Sparkles, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';

/**
 * Home-page AI prompt input. On submit, deep-links to the customizer
 * (`/customize/classic-cotton-tee?ai=<scenario>`) where the AI panel
 * picks up the seeded scenario and runs immediately.
 */
export function HomeAIPrompt(): JSX.Element {
  const t = useTranslations('home.ai');
  const router = useRouter();
  const [scenario, setScenario] = React.useState('');

  const onSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    const trimmed = scenario.trim();
    if (!trimmed) {
      router.push('/customize/classic-cotton-tee?ai=1');
      return;
    }
    router.push(`/customize/classic-cotton-tee?ai=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">AI</p>
      <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('heading')}</h2>
      <p className="max-w-xl text-muted-foreground">{t('subtitle')}</p>
      <div className="flex flex-col gap-2 pt-2 sm:flex-row">
        <label htmlFor="home-ai-input" className="sr-only">
          {t('inputLabel')}
        </label>
        <Input
          id="home-ai-input"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder={t('inputPlaceholder')}
          maxLength={500}
          className="sm:max-w-md"
        />
        <Button type="submit">
          <Wand2 className="me-2 h-4 w-4" />
          {t('submit')}
        </Button>
      </div>
      <p className="pt-1 text-xs text-muted-foreground">
        <Sparkles className="me-1 inline h-3.5 w-3.5 text-accent" aria-hidden="true" />
        {t('cta')}
      </p>
    </form>
  );
}
