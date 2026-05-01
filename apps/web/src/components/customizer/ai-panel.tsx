'use client';

import type { Locale } from '@custom-merch/i18n';
import type { AiDesignSuggestion } from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Copy, ImagePlus, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { getClientApi } from '@/lib/client-api';

import { useCustomizerStore } from './store';

export interface CustomizerAIPanelProps {
  locale: Locale;
  /** Optional scenario seeded by the home page deep link (?ai=...). */
  initialScenario?: string;
}

type AiDesignState = 'idle' | 'suggesting' | 'suggested' | 'generating' | 'generated' | 'error';

interface GeneratedImageState {
  imageUrl: string;
  width: number;
  height: number;
}

export function CustomizerAIPanel({ locale, initialScenario }: CustomizerAIPanelProps): JSX.Element {
  const t = useTranslations('customizer.ai');
  const [scenario, setScenario] = React.useState(initialScenario ?? '');
  const [state, setState] = React.useState<AiDesignState>('idle');
  const [error, setError] = React.useState<string | null>(null);
  const [source, setSource] = React.useState<'doubao' | 'openai' | 'fallback' | null>(null);
  const [suggestions, setSuggestions] = React.useState<AiDesignSuggestion[]>([]);
  const [generated, setGenerated] = React.useState<Record<number, GeneratedImageState>>({});
  const [activeGenerating, setActiveGenerating] = React.useState<number | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const addText = useCustomizerStore((s) => s.addText);
  const addImage = useCustomizerStore((s) => s.addImage);
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  const printArea = useCustomizerStore((s) => s.printArea);
  const productId = useCustomizerStore((s) => s.productId);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const scene = scenario.trim();
    if (scene.length === 0) return;
    setState('suggesting');
    setError(null);
    setGenerated({});
    try {
      const result = await getClientApi().ai.designSuggestions({
        productId,
        locale,
        scene,
        printArea: { width: printArea.width, height: printArea.height },
      });
      setSuggestions(result.suggestions.slice(0, 3));
      setSource(result.source);
      setState('suggested');
    } catch {
      setError(t('fallback'));
      setState('error');
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

  const onGenerateImage = async (index: number, suggestion: AiDesignSuggestion): Promise<void> => {
    setActiveGenerating(index);
    setState('generating');
    setError(null);
    try {
      const image = await getClientApi().ai.generateDesignImage({
        productId,
        prompt: suggestion.prompt,
        size: '2048x2048',
        transparentBackground: true,
      });
      setGenerated((prev) => ({
        ...prev,
        [index]: { imageUrl: image.imageUrl, width: image.width, height: image.height },
      }));
      setState('generated');
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('400') ? t('imageNotConfigured') : t('imageFailed'));
      setState('suggested');
    } finally {
      setActiveGenerating(null);
    }
  };

  const onAddImageToCanvas = (index: number): void => {
    const image = generated[index];
    if (!image) return;
    addImage({
      src: image.imageUrl,
      filename: `ai-design-${index + 1}.png`,
      naturalWidth: image.width,
      naturalHeight: image.height,
    });
    const stateNow = useCustomizerStore.getState();
    const last = stateNow.layers[stateNow.layers.length - 1];
    if (!last) return;
    const targetWidth = Math.min(printArea.width * 0.82, 360);
    const targetHeight = targetWidth * (image.height / image.width || 1);
    updateLayer(last.id, {
      x: printArea.x + (printArea.width - targetWidth) / 2,
      y: printArea.y + (printArea.height - targetHeight) / 2,
      width: targetWidth,
      height: targetHeight,
    });
  };

  const isSuggesting = state === 'suggesting';

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
        <Button type="submit" size="sm" disabled={isSuggesting || scenario.trim().length === 0}>
          {isSuggesting ? <Loader2 className="me-2 h-3.5 w-3.5 animate-spin" /> : <Wand2 className="me-2 h-3.5 w-3.5" />}
          {isSuggesting ? t('generating') : t('generate')}
        </Button>
      </form>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
          {error}
        </p>
      )}

      {source === 'fallback' && suggestions.length > 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-700">
          {t('fallbackMode')}
        </p>
      )}

      {suggestions.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('ideasHeading')}
          </h4>
          <ul className="space-y-3">
            {suggestions.map((suggestion, i) => {
              const image = generated[i];
              const generatingThis = activeGenerating === i;
              return (
                <li key={`${suggestion.title}-${i}`} className="space-y-2 rounded-md border bg-card p-2 text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold">{suggestion.title}</p>
                    <p className="text-muted-foreground">{suggestion.layout}</p>
                    <p className="font-medium">{suggestion.slogan}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t('ideaPalette')}:</span>
                      {suggestion.colors.map((c) => (
                        <span
                          key={c}
                          className="inline-block h-4 w-4 rounded-sm border"
                          style={{ backgroundColor: c }}
                          aria-label={c}
                          title={c}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                      onClick={() => addText(suggestion.slogan)}
                    >
                      {t('applySlogan')}
                    </button>
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-[11px] font-medium hover:bg-accent"
                      onClick={() => void onCopy(`prompt-${i}`, suggestion.prompt)}
                    >
                      <Copy className="me-1 inline h-3 w-3" />
                      {t('copyPrompt')}
                    </button>
                    <button
                      type="button"
                      className="rounded bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                      disabled={generatingThis}
                      onClick={() => void onGenerateImage(i, suggestion)}
                    >
                      {generatingThis ? <Loader2 className="me-1 inline h-3 w-3 animate-spin" /> : <ImagePlus className="me-1 inline h-3 w-3" />}
                      {generatingThis ? t('imageGenerating') : t('generateImage')}
                    </button>
                  </div>

                  {image && (
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageUrl}
                        alt={suggestion.title}
                        className="aspect-square w-full rounded border object-contain"
                      />
                      <button
                        type="button"
                        className="w-full rounded bg-primary px-2 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
                        onClick={() => onAddImageToCanvas(i)}
                      >
                        {t('addImageToCanvas')}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {copied?.startsWith('prompt') && (
            <p className="text-[11px] text-muted-foreground">{t('copied')}</p>
          )}
        </section>
      )}
    </div>
  );
}
