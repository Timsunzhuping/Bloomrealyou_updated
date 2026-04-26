'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import { ApiError } from '@custom-merch/sdk';
import type { CartDto, CartItemDto } from '@custom-merch/shared';
import {
  Button,
  EmptyState,
  ErrorState,
  LoadingState,
  QuantitySelector,
} from '@custom-merch/ui';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

interface Props {
  locale: Locale;
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>',
  );

export function CartPageClient({ locale }: Props): JSX.Element {
  const t = useTranslations('cart');
  const tProducts = useTranslations('products');
  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loadState, setLoadState] = React.useState<'idle' | 'loading' | 'error'>('loading');
  const [pendingItem, setPendingItem] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    setLoadState('loading');
    try {
      const dto = await getClientApi().cart.get();
      setCart(dto);
      setLoadState('idle');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[cart] load failed', (err as Error).message);
      setLoadState('error');
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const updateQuantity = async (item: CartItemDto, next: number): Promise<void> => {
    if (next === item.quantity) return;
    setPendingItem(item.id);
    try {
      const dto = await getClientApi().cart.updateItem(item.id, { quantity: next });
      setCart(dto);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      // eslint-disable-next-line no-console
      console.warn('[cart] update failed', status, (err as Error).message);
      setToast(t('actions.saveFailed'));
    } finally {
      setPendingItem(null);
    }
  };

  const removeItem = async (item: CartItemDto): Promise<void> => {
    setPendingItem(item.id);
    try {
      const dto = await getClientApi().cart.removeItem(item.id);
      setCart(dto);
      setToast(t('actions.removed'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[cart] remove failed', (err as Error).message);
      setToast(t('actions.saveFailed'));
    } finally {
      setPendingItem(null);
    }
  };

  if (loadState === 'loading' && !cart) {
    return (
      <section className="py-10">
        <LoadingState label={t('actions.saving')} />
      </section>
    );
  }
  if (loadState === 'error') {
    return (
      <section className="py-10">
        <ErrorState
          title={t('actions.saveFailed')}
          description={t('actions.saveFailed')}
          action={
            <Button onClick={() => void refresh()}>
              {t('actions.continueShopping')}
            </Button>
          }
        />
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="py-10">
        <EmptyState
          title={t('empty.title')}
          description={t('empty.body')}
          action={
            <Button asChild>
              <Link href="/products">{t('empty.cta')}</Link>
            </Button>
          }
        />
      </section>
    );
  }

  const longestLeadDays = cart.items.reduce(
    (acc, i) => Math.max(acc, i.pricingSnapshot.estimatedDeliveryDays),
    0,
  );

  return (
    <section className="space-y-8 pb-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('summary.itemCount', { count: cart.itemCount })}
        </p>
      </header>

      {toast && (
        <div className="rounded-md bg-foreground px-4 py-2 text-center text-xs text-background">
          {toast}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-4">
          {cart.items.map((item) => {
            const printMethodLabel = item.printMethod
              ? tProducts(`printMethods.${item.printMethod}`)
              : null;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-start"
              >
                <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-md border bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.previewImageUrl ?? PLACEHOLDER_IMG}
                    alt={t('item.previewAlt')}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{item.productNameSnapshot}</h2>
                      <p className="text-xs text-muted-foreground">
                        {t('item.skuLabel')}: {item.variantSkuSnapshot}
                      </p>
                      {item.customizationId && (
                        <p className="text-xs text-muted-foreground">{t('item.designLabel')}</p>
                      )}
                      {printMethodLabel && (
                        <p className="text-xs text-muted-foreground">
                          {t('item.printMethod')}: {printMethodLabel}
                        </p>
                      )}
                      {item.printAreas.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {t('item.printAreas')}: {item.printAreas.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="text-xs text-muted-foreground">{t('item.unitPrice')}</p>
                      <p className="font-semibold">
                        {formatCurrency(item.unitPrice, locale)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <QuantitySelector
                      value={item.quantity}
                      onChange={(n) => void updateQuantity(item, n)}
                      disabled={pendingItem === item.id}
                      labels={{ decrement: '−', increment: '+', input: t('item.quantity') }}
                    />
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">
                        {formatCurrency(item.totalPrice, locale)}
                      </span>
                      <button
                        type="button"
                        onClick={() => void removeItem(item)}
                        disabled={pendingItem === item.id}
                        aria-label={t('item.remove')}
                        className="grid h-9 w-9 place-items-center rounded-md border text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="space-y-3 self-start rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">{t('summary.heading')}</h2>
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('summary.subtotal')}</dt>
              <dd>{formatCurrency(cart.subtotal, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('summary.shipping')}</dt>
              <dd>{formatCurrency(cart.shipping, locale)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('summary.tax')}</dt>
              <dd>{formatCurrency(cart.tax, locale)}</dd>
            </div>
            <div className="border-t pt-2" />
            <div className="flex justify-between text-base font-semibold">
              <dt>{t('summary.total')}</dt>
              <dd>{formatCurrency(cart.total, locale)}</dd>
            </div>
          </dl>
          {longestLeadDays > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('summary.estimatedDelivery', { days: longestLeadDays })}
            </p>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Button size="lg" disabled>
              {t('actions.checkout')}
            </Button>
            <Button asChild variant="outline">
              <Link href="/products">{t('actions.continueShopping')}</Link>
            </Button>
          </div>
        </aside>
      </div>
    </section>
  );
}
