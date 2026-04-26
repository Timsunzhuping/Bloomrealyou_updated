'use client';

import { Image as ImageIcon, Layers, Sparkles, Type, Wand2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useCustomizerStore } from './store';

export type LeftPanel = 'upload' | 'text' | 'templates' | 'ai' | 'layers';

export interface CustomizerLeftToolbarProps {
  active: LeftPanel;
  onChange: (next: LeftPanel) => void;
  onAddText: () => void;
  onUploadFiles: (files: File[]) => void;
  uploadInputId: string;
}

interface ToolItem {
  key: LeftPanel;
  label: string;
  icon: React.ReactNode;
}

export function CustomizerLeftToolbar({
  active,
  onChange,
  onAddText,
  onUploadFiles,
  uploadInputId,
}: CustomizerLeftToolbarProps): JSX.Element {
  const t = useTranslations('customizer.tools');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tools: ToolItem[] = [
    { key: 'upload', label: t('addImage'), icon: <ImageIcon className="h-4 w-4" /> },
    { key: 'text', label: t('addText'), icon: <Type className="h-4 w-4" /> },
    { key: 'templates', label: t('templates'), icon: <Sparkles className="h-4 w-4" /> },
    { key: 'ai', label: t('ai'), icon: <Wand2 className="h-4 w-4" /> },
    { key: 'layers', label: t('layers'), icon: <Layers className="h-4 w-4" /> },
  ];

  const onClick = (key: LeftPanel): void => {
    onChange(key);
    if (key === 'text') onAddText();
    if (key === 'upload') inputRef.current?.click();
  };

  return (
    <nav
      aria-label="Customizer tools"
      className="flex flex-row gap-1 overflow-x-auto border-b bg-background p-2 md:flex-col md:gap-2 md:overflow-visible md:border-b-0 md:border-e md:p-3"
    >
      {tools.map((tool) => (
        <button
          key={tool.key}
          type="button"
          onClick={() => onClick(tool.key)}
          aria-pressed={active === tool.key}
          className={`flex min-w-[80px] flex-col items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition-colors md:min-w-0 md:flex-row md:items-center md:justify-start md:gap-2 md:text-sm ${
            active === tool.key
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {tool.icon}
          <span>{tool.label}</span>
        </button>
      ))}
      <input
        ref={inputRef}
        id={uploadInputId}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml"
        className="sr-only"
        multiple
        aria-label={t('addImage')}
        onChange={(e) => {
          const list = e.target.files;
          if (!list) return;
          onUploadFiles(Array.from(list));
          e.target.value = '';
        }}
      />
    </nav>
  );
}

/** Empty-state list for the active left panel sub-content. */
export function CustomizerLeftPanelContent({
  active,
  aiSlot,
}: {
  active: LeftPanel;
  aiSlot?: React.ReactNode;
}): JSX.Element | null {
  const t = useTranslations('customizer');
  const layers = useCustomizerStore((s) => s.layers);
  const selectedLayerId = useCustomizerStore((s) => s.selectedLayerId);
  const selectLayer = useCustomizerStore((s) => s.selectLayer);
  const updateLayer = useCustomizerStore((s) => s.updateLayer);
  const removeLayer = useCustomizerStore((s) => s.removeLayer);

  if (active === 'templates') {
    return (
      <p className="px-3 py-2 text-xs text-muted-foreground">
        {t('panels.templatesPlaceholder')}
      </p>
    );
  }
  if (active === 'ai') {
    return <>{aiSlot ?? <p className="px-3 py-2 text-xs text-muted-foreground">{t('panels.aiPlaceholder')}</p>}</>;
  }
  if (active === 'upload') {
    return <p className="px-3 py-2 text-xs text-muted-foreground">{t('upload.accepted')}</p>;
  }

  if (active === 'layers') {
    if (layers.length === 0) {
      return <p className="px-3 py-2 text-xs text-muted-foreground">{t('layer.empty')}</p>;
    }
    return (
      <ul className="space-y-1 px-2 py-2">
        {[...layers].reverse().map((layer) => {
          const label =
            layer.type === 'text'
              ? `${t('layer.textLabel')}: ${layer.text.slice(0, 16) || '—'}`
              : `${t('layer.imageLabel')}: ${layer.filename}`;
          return (
            <li key={layer.id}>
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                  selectedLayerId === layer.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground hover:bg-accent'
                }`}
              >
                <button
                  type="button"
                  className="flex-1 truncate text-start"
                  onClick={() => selectLayer(layer.id)}
                >
                  {label}
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-muted-foreground hover:bg-background"
                  aria-label={layer.visible ? t('layer.hide') : t('layer.show')}
                  onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                >
                  {layer.visible ? '👁' : '—'}
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-destructive hover:bg-destructive/10"
                  aria-label={t('layer.delete')}
                  onClick={() => removeLayer(layer.id)}
                >
                  ×
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return null;
}
