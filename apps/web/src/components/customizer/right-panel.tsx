'use client';

import { Button, Input, Label } from '@custom-merch/ui';
import { ArrowDownToLine, ArrowUpFromLine, Lock, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { isOutsideSafeArea, isLowResolution, useCustomizerStore } from './store';
import type { ImageLayer, Layer, TextLayer } from './types';

export function CustomizerRightPanel(): JSX.Element {
  const t = useTranslations('customizer');
  const tProps = useTranslations('customizer.properties');

  const safeArea = useCustomizerStore((s) => s.safeArea);
  const selectedId = useCustomizerStore((s) => s.selectedLayerId);
  const layers = useCustomizerStore((s) => s.layers);
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  const removeLayer = useCustomizerStore((s) => s.removeLayer);
  const bringForward = useCustomizerStore((s) => s.bringForward);
  const sendBackward = useCustomizerStore((s) => s.sendBackward);

  const layer = selectedId ? layers.find((l) => l.id === selectedId) ?? null : null;

  if (!layer) {
    return (
      <aside className="hidden border-s bg-background p-4 md:block md:w-72">
        <p className="text-sm text-muted-foreground">{t('panels.selectObjectHint')}</p>
      </aside>
    );
  }

  const warnings: string[] = [];
  if (isOutsideSafeArea(layer, safeArea)) warnings.push(t('warnings.outsideSafeArea'));
  if (isLowResolution(layer)) warnings.push(t('warnings.lowResolution'));

  return (
    <aside className="border-s bg-background p-4 md:w-72">
      <div className="space-y-4">
        <header className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">{t('panels.properties')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label={tProps('shared.bringForward')}
              onClick={() => bringForward(layer.id)}
            >
              <ArrowUpFromLine className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label={tProps('shared.sendBackward')}
              onClick={() => sendBackward(layer.id)}
            >
              <ArrowDownToLine className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-muted-foreground hover:bg-accent"
              aria-label={tProps('shared.lock')}
              onClick={() => updateLayer(layer.id, { locked: !layer.locked })}
            >
              <Lock className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-destructive hover:bg-destructive/10"
              aria-label={tProps('shared.delete')}
              onClick={() => removeLayer(layer.id)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {layer.type === 'text' ? (
          <TextProperties layer={layer} />
        ) : (
          <ImageProperties layer={layer} />
        )}

        <SharedTransformProperties layer={layer} />

        {warnings.length > 0 && (
          <ul className="space-y-1 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs text-warning-foreground">
            {warnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

const FONT_OPTIONS = ['Inter', 'Helvetica', 'Georgia', 'Courier New', 'Comic Sans MS'] as const;

function TextProperties({ layer }: { layer: TextLayer }): JSX.Element {
  const t = useTranslations('customizer.properties.text');
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`${layer.id}-text`}>{t('content')}</Label>
        <Input
          id={`${layer.id}-text`}
          value={layer.text}
          onChange={(e) => updateLayer(layer.id, { text: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${layer.id}-font`}>{t('fontFamily')}</Label>
          <select
            id={`${layer.id}-font`}
            value={layer.fontFamily}
            onChange={(e) => updateLayer(layer.id, { fontFamily: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${layer.id}-size`}>{t('fontSize')}</Label>
          <Input
            id={`${layer.id}-size`}
            type="number"
            min={8}
            max={400}
            value={layer.fontSize}
            onChange={(e) =>
              updateLayer(layer.id, { fontSize: Math.max(8, Number(e.target.value) || 0) })
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${layer.id}-color`}>{t('color')}</Label>
          <input
            id={`${layer.id}-color`}
            type="color"
            value={layer.color}
            onChange={(e) => updateLayer(layer.id, { color: e.target.value })}
            className="h-9 w-full cursor-pointer rounded-md border border-input bg-background"
            aria-label={t('color')}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${layer.id}-align`}>{t('textAlign')}</Label>
          <select
            id={`${layer.id}-align`}
            value={layer.textAlign}
            onChange={(e) =>
              updateLayer(layer.id, {
                textAlign: e.target.value as TextLayer['textAlign'],
              })
            }
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="left">{t('alignLeft')}</option>
            <option value="center">{t('alignCenter')}</option>
            <option value="right">{t('alignRight')}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ImageProperties({ layer }: { layer: ImageLayer }): JSX.Element {
  const t = useTranslations('customizer.properties.image');
  return (
    <div className="space-y-2 text-sm">
      <p>
        <span className="text-muted-foreground">{t('filename')}:</span>{' '}
        <span className="font-medium">{layer.filename}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {t('width')} {Math.round(layer.naturalWidth)} × {t('height')}{' '}
        {Math.round(layer.naturalHeight)} px
      </p>
    </div>
  );
}

function SharedTransformProperties({ layer }: { layer: Layer }): JSX.Element {
  const t = useTranslations('customizer.properties.shared');
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid grid-cols-2 gap-2">
        <FieldNumber
          id={`${layer.id}-x`}
          label={t('x')}
          value={layer.x}
          onChange={(v) => updateLayer(layer.id, { x: v })}
        />
        <FieldNumber
          id={`${layer.id}-y`}
          label={t('y')}
          value={layer.y}
          onChange={(v) => updateLayer(layer.id, { y: v })}
        />
      </div>
      <FieldNumber
        id={`${layer.id}-rotation`}
        label={t('rotation')}
        value={layer.rotation}
        onChange={(v) => updateLayer(layer.id, { rotation: v })}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`${layer.id}-opacity`}>{t('opacity')}</Label>
        <input
          id={`${layer.id}-opacity`}
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={layer.opacity}
          onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
          className="w-full"
          aria-label={t('opacity')}
        />
      </div>
    </div>
  );
}

function FieldNumber({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (next: number) => void;
}): JSX.Element {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  );
}
