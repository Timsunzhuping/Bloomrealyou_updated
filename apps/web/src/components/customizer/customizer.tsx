'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import { ApiError } from '@custom-merch/sdk';
import type {
  CustomerDesignDto,
  PricingResult,
  Product,
  ProductPrintArea,
  ProductVariant,
  ValidationCode,
  ValidationIssue,
  ValidationResult,
} from '@custom-merch/shared';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

import { CustomizerAIPanel } from './ai-panel';
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
  /** When set, hydrate the customizer from the persisted design. */
  initialDesignId?: string;
  /** Optional scenario string prefilled into the AI panel from ?ai=. */
  initialAiScenario?: string;
}

/** Snapshot embedded inside designJson for store geometry — survives loadDesignJson(). */
type SerializableSnapshot = ReturnType<typeof useCustomizerStore.getState>['toDesignJson'] extends () => infer R
  ? R
  : never;

export function Customizer({
  locale,
  product,
  variants,
  printAreas,
  initialVariantId,
  initialDesignId,
  initialAiScenario,
}: CustomizerProps): JSX.Element {
  const t = useTranslations('customizer');
  const tTopBar = useTranslations('customizer.topBar');
  const tWarn = useTranslations('customizer.warnings');
  const tValidation = useTranslations('customizer.validation');
  const router = useRouter();

  const setContext = useCustomizerStore((s) => s.setContext);
  const reset = useCustomizerStore((s) => s.reset);
  const addText = useCustomizerStore((s) => s.addText);
  const addImage = useCustomizerStore((s) => s.addImage);
  const toDesignJson = useCustomizerStore((s) => s.toDesignJson);
  const loadDesignJson = useCustomizerStore((s) => s.loadDesignJson);

  const [activePanel, setActivePanel] = React.useState<LeftPanel>(
    initialAiScenario ? 'ai' : 'layers',
  );
  const [quantity, setQuantity] = React.useState(1);
  const [toast, setToast] = React.useState<string | null>(null);
  const [savedDesignId, setSavedDesignId] = React.useState<string | null>(
    initialDesignId ?? null,
  );
  const [isWorking, setIsWorking] = React.useState(false);
  const [validationModal, setValidationModal] = React.useState<
    | { result: ValidationResult; onConfirm: () => void; canConfirm: boolean }
    | null
  >(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<CanvasStageHandle>(null);
  const [containerWidth, setContainerWidth] = React.useState(640);
  const [pricing, setPricing] = React.useState<PricingResult | null>(null);

  const printAreaKeys = React.useMemo(
    () => printAreas.map((a) => a.key).slice(0, 1),
    [printAreas],
  );
  const defaultPrintMethod = product.supportedPrintMethods[0];

  // Live pricing: re-calculate whenever quantity changes.
  React.useEffect(() => {
    let cancelled = false;
    const variantId = initialVariantId ?? variants[0]?.id;
    if (!variantId) return;
    const handle = window.setTimeout(() => {
      void getClientApi()
        .pricing.calculate({
          productId: product.id,
          variantId,
          quantity,
          printMethod: defaultPrintMethod,
          printAreas: printAreaKeys,
          shippingCountry: 'US',
        })
        .then((next) => {
          if (!cancelled) setPricing(next);
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.warn('[customizer] pricing failed', (err as Error).message);
        });
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [defaultPrintMethod, initialVariantId, printAreaKeys, product.id, quantity, variants]);

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

  // Hydrate from server when ?designId= is supplied.
  React.useEffect(() => {
    if (!initialDesignId) return;
    let cancelled = false;
    (async () => {
      try {
        const dto = await getClientApi().customizations.get(initialDesignId);
        if (cancelled) return;
        loadDesignJson(dto.designJson as unknown as SerializableSnapshot);
        setSavedDesignId(dto.id);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[customizer] could not load design', (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDesignId]);

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
        const reader = new FileReader();
        reader.onload = () => {
          const src = typeof reader.result === 'string' ? reader.result : '';
          if (!src) return;
          const img = new window.Image();
          img.onload = () => {
            addImage({
              src,
              filename: file.name,
              mime: file.type,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            });
          };
          img.src = src;
        };
        reader.readAsDataURL(file);
      }
    },
    [addImage, tWarn],
  );

  /** Captures a preview from the stage (data URL). */
  const captureDataUrl = React.useCallback((): string | null => {
    return stageRef.current?.exportPreview(2) ?? null;
  }, []);

  const captureProductionDataUrl = React.useCallback((): string | null => {
    return stageRef.current?.exportProduction(4) ?? captureDataUrl();
  }, [captureDataUrl]);

  const persist = React.useCallback(
    async (existingId: string | null): Promise<CustomerDesignDto | null> => {
      const json = toDesignJson();
      const previewDataUrl = captureDataUrl() ?? undefined;
      const api = getClientApi();
      try {
        if (existingId) {
          return await api.customizations.patch(existingId, {
            designJson: json as unknown as Record<string, unknown>,
            previewDataUrl,
          });
        }
        return await api.customizations.create({
          productId: product.id,
          variantId: json.variantId,
          name: localizedName,
          designJson: json as unknown as Record<string, unknown>,
          previewDataUrl,
        });
      } catch (err) {
        const status = err instanceof ApiError ? err.status : -1;
        // eslint-disable-next-line no-console
        console.warn('[customizer] save failed', status, (err as Error).message);
        return null;
      }
    },
    [captureDataUrl, localizedName, product.id, toDesignJson],
  );

  const handleSave = React.useCallback(async () => {
    setIsWorking(true);
    setToast(tTopBar('saving'));
    // Always keep a local-storage backup as well.
    try {
      window.localStorage.setItem(
        `cmp:design:${product.slug}`,
        JSON.stringify(toDesignJson()),
      );
    } catch {
      /* localStorage unavailable */
    }

    const dto = await persist(savedDesignId);
    if (dto) {
      setSavedDesignId(dto.id);
      setToast(tTopBar('savedRemote'));
    } else {
      setToast(tTopBar('draftSaved'));
    }
    setIsWorking(false);
  }, [persist, product.slug, savedDesignId, tTopBar, toDesignJson]);

  const handlePreview = React.useCallback(async () => {
    const dataUrl = captureDataUrl();
    if (!dataUrl) return;
    // Open immediately for the user; concurrently push to API for persistence.
    const w = window.open();
    if (w) {
      w.document.title = localizedName;
      w.document.body.style.margin = '0';
      const img = w.document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';
      w.document.body.appendChild(img);
    }

    let designId = savedDesignId;
    if (!designId) {
      const dto = await persist(null);
      designId = dto?.id ?? null;
      if (designId) setSavedDesignId(designId);
    }
    if (designId) {
      try {
        await getClientApi().customizations.renderPreview(designId, {
          previewDataUrl: dataUrl,
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[customizer] render-preview failed', (err as Error).message);
      }
    }
  }, [captureDataUrl, localizedName, persist, savedDesignId]);

  const handleAddToCart = React.useCallback(async () => {
    setIsWorking(true);
    setToast(tTopBar('validating'));

    let designId = savedDesignId;
    if (!designId) {
      const dto = await persist(null);
      designId = dto?.id ?? null;
      if (designId) setSavedDesignId(designId);
    }

    if (!designId) {
      setToast(tTopBar('saveFailed'));
      setIsWorking(false);
      return;
    }

    let result: ValidationResult;
    try {
      result = await getClientApi().customizations.validate(designId, {});
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[customizer] validation failed', (err as Error).message);
      setToast(tTopBar('saveFailed'));
      setIsWorking(false);
      return;
    }

    setIsWorking(false);

    if (!result.ok) {
      setToast(tTopBar('validationFailed'));
      setValidationModal({ result, onConfirm: () => undefined, canConfirm: false });
      return;
    }
    if (result.warnings.length > 0) {
      setToast(tTopBar('validationWarnings'));
      setValidationModal({
        result,
        canConfirm: true,
        onConfirm: () => {
          setValidationModal(null);
          finalizeAddToCart(designId, result);
        },
      });
      return;
    }
    finalizeAddToCart(designId, result);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persist, savedDesignId, tTopBar]);

  const finalizeAddToCart = React.useCallback(
    async (designId: string, _validation: ValidationResult): Promise<void> => {
      const variantId = initialVariantId ?? variants[0]?.id;
      if (!variantId) {
        setToast(tTopBar('saveFailed'));
        return;
      }
      try {
        const productionDataUrl = captureProductionDataUrl() ?? captureDataUrl() ?? undefined;
        await getClientApi().customizations.generateProductionFile(designId, {
          formats: ['png', 'svg', 'pdf', 'json'],
          productionDataUrl,
        });
        await getClientApi().cart.addItem({
          productId: product.id,
          variantId,
          customizationId: designId,
          quantity,
          printMethod: defaultPrintMethod,
          printAreas: printAreaKeys,
          previewImageUrl: pricing ? captureDataUrl() : undefined,
          productNameSnapshot: localizedName,
        });
        setToast(tTopBar('addedToCart'));
        router.push('/cart');
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[customizer] add-to-cart failed', (err as Error).message);
        setToast(tTopBar('saveFailed'));
      }
    },
    [
      captureDataUrl,
      captureProductionDataUrl,
      defaultPrintMethod,
      initialVariantId,
      localizedName,
      pricing,
      printAreaKeys,
      product.id,
      quantity,
      router,
      tTopBar,
      variants,
    ],
  );

  const totalLabel = pricing
    ? formatCurrency(pricing.total, locale)
    : formatCurrency(
        { amountMinor: product.basePrice.amountMinor * quantity, currency: product.basePrice.currency },
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
            <CustomizerLeftPanelContent
              active={activePanel}
              aiSlot={<CustomizerAIPanel locale={locale} initialScenario={initialAiScenario} />}
            />
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

      {validationModal && (
        <ValidationModal
          result={validationModal.result}
          canConfirm={validationModal.canConfirm}
          onConfirm={validationModal.onConfirm}
          onDismiss={() => setValidationModal(null)}
          tValidation={tValidation}
        />
      )}

      {isWorking && <span className="sr-only">{tTopBar('saving')}</span>}
    </div>
  );
}

interface ValidationModalProps {
  result: ValidationResult;
  canConfirm: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  tValidation: ReturnType<typeof useTranslations>;
}

function ValidationModal({
  result,
  canConfirm,
  onConfirm,
  onDismiss,
  tValidation,
}: ValidationModalProps): JSX.Element {
  const issueLabel = (issue: ValidationIssue): string => {
    try {
      return tValidation(issue.code as ValidationCode);
    } catch {
      return issue.message;
    }
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
    >
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-background p-6 shadow-lg">
        {result.errors.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-destructive">
              {tValidation('errorsTitle')} ({result.errors.length})
            </h3>
            <ul className="mt-1 space-y-1 text-sm">
              {result.errors.map((e, i) => (
                <li key={i} className="text-foreground">
                  • {issueLabel(e)}
                </li>
              ))}
            </ul>
          </section>
        )}
        {result.warnings.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-warning-foreground">
              {tValidation('warningsTitle')} ({result.warnings.length})
            </h3>
            <ul className="mt-1 space-y-1 text-sm">
              {result.warnings.map((w, i) => (
                <li key={i} className="text-muted-foreground">
                  • {issueLabel(w)}
                </li>
              ))}
            </ul>
          </section>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            ✕
          </button>
          {canConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              {tValidation('continueAnyway')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
