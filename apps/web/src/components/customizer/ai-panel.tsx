'use client';

import type { Locale } from '@custom-merch/i18n';
import type {
  AiDesignIdeasResult,
  AiGenerateSloganResult,
  AiLogoLayoutResult,
  DesignIdea,
  LogoLayout,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Copy, Sparkles, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { getClientApi } from '@/lib/client-api';

import { useCustomizerStore } from './store';

export interface CustomizerAIPanelProps {
  locale: Locale;
  /** Optional scenario seeded by the home page deep link (?ai=…). */
  initialScenario?: string;
}

export function CustomizerAIPanel({ locale, initialScenario }: CustomizerAIPanelProps): JSX.Element {
  const t = useTranslations('customizer.ai');
  const [scenario, setScenario] = React.useState(initialScenario ?? '');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [slogans, setSlogans] = React.useState<AiGenerateSloganResult['slogans']>([]);
  const [ideas, setIdeas] = React.useState<DesignIdea[]>([]);
  const [layouts, setLayouts] = React.useState<LogoLayout[]>([]);
  const [copied, setCopied] = React.useState<string | null>(null);

  const addText = useCustomizerStore((s) => s.addText);
  const printArea = useCustomizerStore((s) => s.printArea);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (scenario.trim().length === 0) return;
    setLoading(true);
    setError(false);
    try {
      const api = getClientApi();
      const [sloganResp, ideaResp, layoutResp] = await Promise.allSettled([
        api.ai.generateSlogan({ prompt: scenario, locale, count: 4 }),
        api.ai.designIdeas({ prompt: scenario, locale }),
        api.ai.logoLayout({ prompt: scenario, locale }),
      ]);

      if (sloganResp.status === 'fulfilled') setSlogans(sloganResp.value.slogans);
      if (ideaResp.status === 'fulfilled') setIdeas((ideaResp.value as AiDesignIdeasResult).ideas);
      if (layoutResp.status === 'fulfilled')
        setLayouts((layoutResp.value as AiLogoLayoutResult).layouts);
      if (
        sloganResp.status === 'rejected' &&
        ideaResp.status === 'rejected' &&
        layoutResp.status === 'rejected'
      ) {
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async (key: string, value: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const onApplyLayout = (layout: LogoLayout): void => {
    // Convert relative coords to canvas coords, place a placeholder text per object.
    for (const obj of layout.objects) {
      if (obj.type === 'text' || obj.type === 'logo') {
        const x = printArea.x + obj.x * printArea.width;
        const y = printArea.y + obj.y * printArea.height;
        const w = obj.width * printArea.width;
        const h = obj.height * printArea.height;
        addText(obj.content ?? layout.name);
        // The store places newly-added text near canvas centre by default,
        // so push it to the layout-suggested position by patching the latest layer.
        const state = useCustomizerStore.getState();
        const last = state.layers[state.layers.length - 1];
        if (last) state.updateLayer(last.id, { x, y, width: w, height: Math.max(h, 24) });
      }
    }
  };

  return (
    <div className="space-y-4 p-3">
      <div>
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent" />
          {t('panelTitle')}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{t('panelSubtitle')}</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-2">
        <label className="text-xs font-medium" htmlFor="ai-scenario">
          {t('scenarioLabel')}
        </label>
        <Input
          id="ai-scenario"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder={t('scenarioPlaceholder')}
          maxLength={500}
        />
        <Button type="submit" size="sm" disabled={loading || scenario.trim().length === 0}>
          <Wand2 className="me-2 h-3.5 w-3.5" />
          {loading ? t('generating') : t('generate')}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {t('fallback')}
        </p>
      )}

      {slogans.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('slogansHeading')}
          </h4>
          <ul className="space-y-2">
            {slogans.map((slogan, i) => (
              <li
                key={`${slogan.text}-${i}`}
                className="flex items-start gap-2 rounded-md border bg-card p-2 text-xs"
              >
                <span className="flex-1">{slogan.text}</span>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label={t('copy')}
                  onClick={() => void onCopy(`slogan-${i}`, slogan.text)}
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => addText(slogan.text)}
                >
                  {t('applySlogan')}
                </button>
              </li>
            ))}
          </ul>
          {copied?.startsWith('slogan') && (
            <p className="text-[11px] text-muted-foreground">{t('copied')}</p>
          )}
        </section>
      )}

      {ideas.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('ideasHeading')}
          </h4>
          <ul className="space-y-2">
            {ideas.map((idea, i) => (
              <li key={i} className="space-y-1.5 rounded-md border bg-card p-2 text-xs">
                <p className="font-semibold">{idea.title}</p>
                <p className="text-muted-foreground">{idea.layoutSuggestion}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">{t('ideaPalette')}:</span>
                  {idea.colors.map((c) => (
                    <span
                      key={c}
                      className="inline-block h-4 w-4 rounded-sm border"
                      style={{ backgroundColor: c }}
                      aria-label={c}
                      title={c}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t('ideaProducts')}: {idea.recommendedProducts.join(', ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {layouts.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('layoutsHeading')}
          </h4>
          <ul className="space-y-2">
            {layouts.map((layout, i) => (
              <li key={i} className="space-y-1.5 rounded-md border bg-card p-2 text-xs">
                <p className="font-semibold">{layout.name}</p>
                <p className="text-muted-foreground">{layout.description}</p>
                <button
                  type="button"
                  className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                  onClick={() => onApplyLayout(layout)}
                >
                  {t('applyLayout')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
