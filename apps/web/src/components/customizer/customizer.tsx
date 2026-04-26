'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import type {
  Product,
  ProductPrintArea,
  ProductVariant,
} from '@custom-merch/shared';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { CustomizerBottomBar } from './bottom-bar';
import type { CanvasStageHandle } from './canvas-stage';
import {
  CustomizerLeftPanelContent,
  CustomizerLeftToolbar,
  type LeftPanel,
} from './left-toolbar';
import { CustomizerRightPanel } from './right-panel';
import { useCustomizerStore } from './store';
import { CustomizerTopBar } from './top-bar';

/** Konva is a browser-only library; ensure no SSR. */
const CanvasStage = dynamic<{
  mockupSrc: string;
  containerWidth: number;
  ref?: React.Ref<CanvasStageHandle>;
}>(
  () =>
    import('./canvas-stage').then((mod) => mod.CanvasStage as unknown as React.ComponentType<{
      mockupSrc: string;
      containerWidth: number;
    }>),
  {
    ssr: false,
    loading: () => (
      <div className="grid aspect-square w-full place-items-center bg-muted text-sm text-muted-foreground">
        …
      </div>
    ),
  },
);

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export interface CustomizerProps {
  locale: Locale;
  product: Product;
  variants: ProductVariant[];
  printAreas: ProductPrintArea[];
  /** Optional pre-selected variant id from the URL query. */
  initialVariantId?: string;
}

export function Customizer({
  locale,
  product,
  variants,
  printAreas,
  initialVariantId,
}: CustomizerProps): JSX.Element {
  const t = useTranslations('customizer');
  const tWarn = useTranslations('customizer.warnings');

  const setContext = useCustomizerStore((s) => s.setContext);
  const reset = useCustomizerStore((s) => s.reset);
  const addText = useCustomizerStore((s) => s.addText);
  const addImage = useCustomizerStore((s) => s.addImage);
  const toDesignJson = useCustomizerStore((s) => s.toDesignJson);

  const [activePanel, setActivePanel] = React.useState<LeftPanel>('layers');
  const [quantity, setQuantity] = React.useState(1);
  const [toast, setToast] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<CanvasStageHandle>(null);
  const [containerWidth, setContainerWidth] = React.useState(640);

  // One-time initialization based on product props.
  React.useEffect(() => {
    const printAreaKey = printAreas[0]?.key ?? 'front';
    setContext({
      productId: product.id,
      productSlug: product.slug,
      variantId: initialVariantId ?? variants[0]?.id ?? null,
      printAreaKey,
      canvasWidth: 800,
      canvasHeight: 800,
      printArea: { x: 200, y: 160, width: 400, height: 480 },
      safeArea: { x: 220, y: 180, width: 360, height: 440 },
    });
    return () => reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Track container width so the stage can scale responsively.
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(Math.max(280, Math.min(720, entry.contentRect.width)));
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  const localizedName = product.name[locale] ?? product.name.en;

  const handleUploadFiles = React.useCallback(
    (files: File[]) => {
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          setToast(tWarn('fileTooLarge'));
          continue;
        }
        const url = URL.createObjectURL(file);
        const img = new window.Image();
        img.onload = () => {
          addImage({
            src: url,
            filename: file.name,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
          });
        };
        img.src = url;
      }
    },
    [addImage, tWarn],
  );

  const handleSave = React.useCallback(() => {
    const json = toDesignJson();
    try {
      window.localStorage.setItem(
        `cmp:design:${product.slug}`,
        JSON.stringify(json),
      );
      setToast(t('topBar.draftSaved'));
    } catch {
      // localStorage unavailable — fall back to console for the MVP.
      // eslint-disable-next-line no-console
      console.warn('[customizer] localStorage unavailable, design not persisted');
    }
  }, [product.slug, t, toDesignJson]);

  const handlePreview = React.useCallback(() => {
    const dataUrl = stageRef.current?.exportPreview(2);
    if (!dataUrl) return;
    const w = window.open();
    if (w) {
      w.document.title = localizedName;
      w.document.body.style.margin = '0';
      const img = w.document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';
      w.document.body.appendChild(img);
    }
  }, [localizedName]);

  const handleAddToCart = React.useCallback(() => {
    const json = toDesignJson();
    // Cart wiring lands in WP-09. For now we surface confirmation + console.
    // eslint-disable-next-line no-console
    console.info('[customizer] add-to-cart payload', { quantity, design: json });
    setToast(t('topBar.draftSaved'));
  }, [quantity, t, toDesignJson]);

  const totalCents = product.basePrice.amountMinor * quantity;
  const totalLabel = formatCurrency(
    { amountMinor: totalCents, currency: product.basePrice.currency },
    locale,
  );
  const mockupSrc = product.imageUrls[0] ?? '';

  return (
    <div className="-mx-4 flex h-[calc(100vh-3.5rem)] flex-col bg-muted/30 md:-mx-6">
      <CustomizerTopBar
        productSlug={product.slug}
        productName={localizedName}
        onSave={handleSave}
        onPreview={handlePreview}
        onAddToCart={handleAddToCart}
      />

      {toast && (
        <div className="bg-foreground px-4 py-2 text-center text-xs text-background">{toast}</div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <div className="md:w-44">
          <CustomizerLeftToolbar
            active={activePanel}
            onChange={setActivePanel}
            onAddText={() => addText(t('upload.newText'))}
            onUploadFiles={handleUploadFiles}
            uploadInputId="customizer-file-input"
          />
          <div className="hidden border-e bg-background md:block md:max-h-[calc(100vh-12rem)] md:overflow-y-auto">
            <CustomizerLeftPanelContent active={activePanel} />
          </div>
        </div>

        <div
          ref={containerRef}
          className="flex flex-1 items-center justify-center overflow-auto p-4"
        >
          <div className="relative" style={{ width: containerWidth }}>
            <CanvasStage ref={stageRef} mockupSrc={mockupSrc} containerWidth={containerWidth} />
          </div>
        </div>

        <CustomizerRightPanel />
      </div>

      <CustomizerBottomBar
        quantity={quantity}
        onQuantityChange={setQuantity}
        totalLabel={totalLabel}
        leadDays={product.productionLeadDays}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
