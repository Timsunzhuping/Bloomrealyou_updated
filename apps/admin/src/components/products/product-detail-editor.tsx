'use client';

import type {
  AdminProductDto,
  AdminProductPriceTierDto,
  AdminProductPrintAreaDto,
  AdminProductVariantDto,
  UpdateAdminProductInput,
} from '@custom-merch/shared';
import { Button } from '@custom-merch/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { adminFetch } from '@/lib/admin-fetch';

import { ProductForm } from './product-form';

interface Props {
  product: AdminProductDto;
  apiBaseUrl: string;
}

export function ProductDetailEditor({ product, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();

  const [productState, setProductState] = React.useState<AdminProductDto>(product);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = (next: AdminProductDto): void => {
    setProductState(next);
    router.refresh();
  };

  const updateProduct = async (
    payload: UpdateAdminProductInput,
  ): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, `/admin/products/${productState.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const updated = (await res.json()) as AdminProductDto;
      refresh(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <ProductForm
        initial={productState}
        submitting={submitting}
        errorMessage={error}
        onSubmit={async (payload) => updateProduct(payload as UpdateAdminProductInput)}
      />

      <VariantsEditor
        product={productState}
        apiBaseUrl={apiBaseUrl}
        onChange={(next) => refresh(next)}
      />

      <PrintAreasEditor
        product={productState}
        apiBaseUrl={apiBaseUrl}
        onChange={(next) => refresh(next)}
      />

      <PriceTiersEditor
        product={productState}
        apiBaseUrl={apiBaseUrl}
        onChange={(next) => refresh(next)}
      />

      <DangerZone
        product={productState}
        apiBaseUrl={apiBaseUrl}
        onDeleted={() => router.replace('/products')}
      />

      <p className="text-xs text-muted-foreground">
        {t('products.detail.lastUpdated', {
          time: new Date(productState.updatedAt).toLocaleString(),
        })}
      </p>
    </div>
  );
}

// ── variants ────────────────────────────────────────────────────────────

function VariantsEditor({
  product,
  apiBaseUrl,
  onChange,
}: {
  product: AdminProductDto;
  apiBaseUrl: string;
  onChange: (next: AdminProductDto) => void;
}): JSX.Element {
  const t = useTranslations('admin');
  const [draft, setDraft] = React.useState({
    sku: '',
    color: '',
    size: '',
    material: '',
    unitPriceCents: String(product.basePrice.amountMinor),
    isActive: true,
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const attributes: Record<string, string> = {};
      if (draft.color) attributes.color = draft.color;
      if (draft.size) attributes.size = draft.size;
      if (draft.material) attributes.material = draft.material;
      const res = await adminFetch(apiBaseUrl, '/admin/product-variants', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          sku: draft.sku,
          attributes,
          unitPriceMinor: Number(draft.unitPriceCents),
          isActive: draft.isActive,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as AdminProductDto;
      onChange(next);
      setDraft({
        sku: '',
        color: '',
        size: '',
        material: '',
        unitPriceCents: String(product.basePrice.amountMinor),
        isActive: true,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeVariant = async (variant: AdminProductVariantDto): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        apiBaseUrl,
        `/admin/product-variants/${variant.id}?productId=${product.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as AdminProductDto;
      onChange(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('products.variants.heading')}</h3>
      {product.variants.length > 0 ? (
        <ul className="divide-y rounded border bg-background">
          {product.variants.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{v.sku}</span>
                {Object.entries(v.attributes).map(([k, val]) => (
                  <span
                    key={k}
                    className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {k}: {val}
                  </span>
                ))}
                <span className="tabular-nums text-xs text-muted-foreground">
                  {(v.price.amountMinor / 100).toFixed(2)} {v.price.currency}
                </span>
                <span
                  className={`text-xs ${v.isActive ? 'text-emerald-700' : 'text-destructive'}`}
                >
                  {v.isActive ? t('products.variants.active') : t('products.variants.inactive')}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeVariant(v)}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={t('products.variants.remove')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('products.variants.empty')}</p>
      )}

      <form onSubmit={submit} className="grid gap-2 rounded border bg-muted/30 p-3 sm:grid-cols-6">
        <input
          required
          placeholder={t('products.variants.sku')}
          value={draft.sku}
          onChange={(e) => setDraft({ ...draft, sku: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm sm:col-span-2"
        />
        <input
          placeholder={t('products.variants.color')}
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          placeholder={t('products.variants.size')}
          value={draft.size}
          onChange={(e) => setDraft({ ...draft, size: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          placeholder={t('products.variants.material')}
          value={draft.material}
          onChange={(e) => setDraft({ ...draft, material: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          required
          type="number"
          min={0}
          placeholder={t('products.variants.unitPrice')}
          value={draft.unitPriceCents}
          onChange={(e) => setDraft({ ...draft, unitPriceCents: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={busy} className="sm:col-span-6">
          {t('products.variants.add')}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}

// ── print areas ─────────────────────────────────────────────────────────

function PrintAreasEditor({
  product,
  apiBaseUrl,
  onChange,
}: {
  product: AdminProductDto;
  apiBaseUrl: string;
  onChange: (next: AdminProductDto) => void;
}): JSX.Element {
  const t = useTranslations('admin');
  const [draft, setDraft] = React.useState({
    key: '',
    labelEn: '',
    widthPx: '3000',
    heightPx: '3000',
    mockupOffsetXPx: '200',
    mockupOffsetYPx: '200',
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/product-print-areas', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          key: draft.key,
          label: { en: draft.labelEn },
          widthPx: Number(draft.widthPx),
          heightPx: Number(draft.heightPx),
          mockupOffsetXPx: Number(draft.mockupOffsetXPx),
          mockupOffsetYPx: Number(draft.mockupOffsetYPx),
          allowedPrintMethods: product.supportedPrintMethods,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as AdminProductDto;
      onChange(next);
      setDraft({
        key: '',
        labelEn: '',
        widthPx: '3000',
        heightPx: '3000',
        mockupOffsetXPx: '200',
        mockupOffsetYPx: '200',
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeArea = async (area: AdminProductPrintAreaDto): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        apiBaseUrl,
        `/admin/product-print-areas/${area.id}?productId=${product.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange((await res.json()) as AdminProductDto);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('products.printAreas.heading')}</h3>
      {product.printAreas.length > 0 ? (
        <ul className="divide-y rounded border bg-background">
          {product.printAreas.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{a.key}</span>
                <span>{a.label.en}</span>
                <span className="text-xs text-muted-foreground">
                  {a.widthPx}×{a.heightPx}px @ ({a.mockupOffsetXPx}, {a.mockupOffsetYPx})
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeArea(a)}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={t('products.printAreas.remove')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('products.printAreas.empty')}</p>
      )}

      <form onSubmit={submit} className="grid gap-2 rounded border bg-muted/30 p-3 sm:grid-cols-6">
        <input
          required
          placeholder={t('products.printAreas.key')}
          value={draft.key}
          onChange={(e) => setDraft({ ...draft, key: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          required
          placeholder={t('products.printAreas.label')}
          value={draft.labelEn}
          onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="W"
          value={draft.widthPx}
          onChange={(e) => setDraft({ ...draft, widthPx: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder="H"
          value={draft.heightPx}
          onChange={(e) => setDraft({ ...draft, heightPx: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          type="number"
          placeholder="Off X"
          value={draft.mockupOffsetXPx}
          onChange={(e) => setDraft({ ...draft, mockupOffsetXPx: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          type="number"
          placeholder="Off Y"
          value={draft.mockupOffsetYPx}
          onChange={(e) => setDraft({ ...draft, mockupOffsetYPx: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={busy} className="sm:col-span-6">
          {t('products.printAreas.add')}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}

// ── price tiers ─────────────────────────────────────────────────────────

function PriceTiersEditor({
  product,
  apiBaseUrl,
  onChange,
}: {
  product: AdminProductDto;
  apiBaseUrl: string;
  onChange: (next: AdminProductDto) => void;
}): JSX.Element {
  const t = useTranslations('admin');
  const [draft, setDraft] = React.useState({
    minQuantity: '',
    maxQuantity: '',
    unitPriceCents: '',
  });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(apiBaseUrl, '/admin/product-price-tiers', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          minQuantity: Number(draft.minQuantity),
          maxQuantity: draft.maxQuantity ? Number(draft.maxQuantity) : null,
          unitPriceMinor: Number(draft.unitPriceCents),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const next = (await res.json()) as AdminProductDto;
      onChange(next);
      setDraft({ minQuantity: '', maxQuantity: '', unitPriceCents: '' });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const removeTier = async (tier: AdminProductPriceTierDto): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const res = await adminFetch(
        apiBaseUrl,
        `/admin/product-price-tiers/${tier.id}?productId=${product.id}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onChange((await res.json()) as AdminProductDto);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h3 className="text-sm font-semibold">{t('products.priceTiers.heading')}</h3>
      {product.priceTiers.length > 0 ? (
        <ul className="divide-y rounded border bg-background">
          {product.priceTiers.map((tier) => (
            <li key={tier.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-mono text-xs">
                  {tier.minQuantity}–{tier.maxQuantity ?? '∞'}
                </span>
                <span className="tabular-nums">
                  {(tier.unitPrice.amountMinor / 100).toFixed(2)} {tier.unitPrice.currency}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeTier(tier)}
                disabled={busy}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                aria-label={t('products.priceTiers.remove')}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">{t('products.priceTiers.empty')}</p>
      )}

      <form onSubmit={submit} className="grid gap-2 rounded border bg-muted/30 p-3 sm:grid-cols-4">
        <input
          required
          type="number"
          min={1}
          placeholder={t('products.priceTiers.minQty')}
          value={draft.minQuantity}
          onChange={(e) => setDraft({ ...draft, minQuantity: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          type="number"
          min={1}
          placeholder={t('products.priceTiers.maxQty')}
          value={draft.maxQuantity}
          onChange={(e) => setDraft({ ...draft, maxQuantity: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <input
          required
          type="number"
          min={0}
          placeholder={t('products.priceTiers.unitPrice')}
          value={draft.unitPriceCents}
          onChange={(e) => setDraft({ ...draft, unitPriceCents: e.target.value })}
          className="h-9 rounded border border-input bg-background px-2 text-sm"
        />
        <Button type="submit" size="sm" disabled={busy}>
          {t('products.priceTiers.add')}
        </Button>
      </form>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </section>
  );
}

// ── danger zone ─────────────────────────────────────────────────────────

function DangerZone({
  product,
  apiBaseUrl,
  onDeleted,
}: {
  product: AdminProductDto;
  apiBaseUrl: string;
  onDeleted: () => void;
}): JSX.Element {
  const t = useTranslations('admin');
  const [busy, setBusy] = React.useState(false);

  const onDelete = async (): Promise<void> => {
    if (!window.confirm(t('products.delete.confirm'))) return;
    setBusy(true);
    try {
      await adminFetch(apiBaseUrl, `/admin/products/${product.id}`, { method: 'DELETE' });
      onDeleted();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
      <h3 className="text-sm font-semibold text-destructive">
        {t('products.delete.heading')}
      </h3>
      <p className="text-xs text-muted-foreground">{t('products.delete.body')}</p>
      <Button type="button" variant="destructive" disabled={busy} onClick={onDelete}>
        {busy ? t('products.delete.busy') : t('products.delete.cta')}
      </Button>
    </section>
  );
}
