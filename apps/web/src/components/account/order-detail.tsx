'use client';

import { formatCurrency, formatLocalisedDate, type Locale } from '@custom-merch/i18n';
import { ApiError } from '@custom-merch/sdk';
import type { AccountOrderDetailDto } from '@custom-merch/shared';
import {
  Button,
  ErrorState,
  LoadingState,
  OrderStatusBadge,
} from '@custom-merch/ui';
import { Check, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>',
  );

interface Props {
  locale: Locale;
  orderNumber: string;
}

export function AccountOrderDetail({ locale, orderNumber }: Props): JSX.Element {
  const t = useTranslations('account.orders');
  const tDetail = useTranslations('account.orders.detail');
  const tTimeline = useTranslations('account.orders.timeline');
  const tStatus = useTranslations('account.orders.status');
  const [data, setData] = React.useState<AccountOrderDetailDto | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dto = await getClientApi().account.getOrder(orderNumber);
        if (!cancelled) setData(dto);
      } catch (err) {
        if (cancelled) return;
        const status = err instanceof ApiError ? err.status : -1;
        setError(status === 404 || status === 403 ? t('empty') : (err as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderNumber, t]);

  if (error) {
    return (
      <ErrorState
        title={error}
        action={
          <Button asChild variant="outline">
            <Link href="/account/orders">{tDetail('back')}</Link>
          </Button>
        }
      />
    );
  }
  if (!data) return <LoadingState label={t('viewDetails')} />;

  const { order, timeline, trackingNumber, trackingUrl } = data;

  return (
    <article className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/account/orders"
            className="text-xs font-medium text-primary hover:underline"
          >
            ← {tDetail('back')}
          </Link>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{order.orderNumber}</h2>
          <p className="text-sm text-muted-foreground">
            {formatLocalisedDate(order.placedAt, locale, 'long-date')}
          </p>
        </div>
        <OrderStatusBadge
          status="paid"
          label={tStatus(order.status)}
        />
      </header>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="mb-4 text-base font-semibold">{tTimeline('heading')}</h3>
        <ol className="space-y-3">
          {timeline.map((event) => (
            <li key={event.key} className="flex items-start gap-3 text-sm">
              {event.state === 'completed' ? (
                <Check className="mt-0.5 h-4 w-4 text-success" aria-hidden="true" />
              ) : event.state === 'current' ? (
                <Circle className="mt-0.5 h-4 w-4 fill-primary text-primary" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
              <div>
                <p
                  className={
                    event.state === 'upcoming'
                      ? 'text-muted-foreground'
                      : 'font-medium text-foreground'
                  }
                >
                  {tTimeline(event.key)}
                </p>
                {event.occurredAt && (
                  <p className="text-xs text-muted-foreground">
                    {formatLocalisedDate(event.occurredAt, locale, 'datetime')}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold">{tDetail('shippingAddress')}</h3>
          <AddressBlock address={order.shippingAddress} />
          <p className="mt-3 text-xs text-muted-foreground">
            {tDetail('shippingMethod')}: {order.shippingMethod}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-5">
          <h3 className="mb-2 text-sm font-semibold">{tDetail('billingAddress')}</h3>
          <AddressBlock address={order.billingAddress} />
        </div>
      </section>

      <section className="rounded-lg border bg-card p-5">
        <h3 className="mb-2 text-sm font-semibold">{tDetail('trackingNumber')}</h3>
        {trackingNumber ? (
          <p className="text-sm">
            <span className="font-medium">{trackingNumber}</span>
            {trackingUrl && (
              <>
                {' · '}
                <a
                  href={trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {tDetail('openTracking')}
                </a>
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{tDetail('trackingPending')}</p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{tDetail('items')}</h3>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-start"
            >
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.previewImageUrl ?? PLACEHOLDER_IMG}
                  alt={tDetail('preview')}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-1 text-sm">
                <p className="font-semibold">{item.productNameSnapshot}</p>
                <p className="text-xs text-muted-foreground">
                  SKU {item.variantSkuSnapshot}
                </p>
                {item.printMethod && (
                  <p className="text-xs text-muted-foreground">{item.printMethod}</p>
                )}
                {item.printAreas.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {item.printAreas.join(', ')}
                  </p>
                )}
              </div>
              <div className="text-end text-sm">
                <p className="text-xs text-muted-foreground">
                  {tDetail('quantity')} × {item.quantity}
                </p>
                <p>{formatCurrency(item.unitPrice, locale)}</p>
                <p className="font-semibold">{formatCurrency(item.totalPrice, locale)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex justify-end rounded-lg border bg-muted/30 p-5 text-sm">
        <dl className="w-full max-w-xs space-y-1">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotal</dt>
            <dd>{formatCurrency(order.subtotal, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Shipping</dt>
            <dd>{formatCurrency(order.shipping, locale)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Tax</dt>
            <dd>{formatCurrency(order.tax, locale)}</dd>
          </div>
          <div className="flex justify-between border-t pt-1.5 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatCurrency(order.total, locale)}</dd>
          </div>
        </dl>
      </section>
    </article>
  );
}

function AddressBlock({ address }: { address: import('@custom-merch/shared').Address }): JSX.Element {
  return (
    <address className="text-sm not-italic text-foreground">
      <p className="font-medium">{address.fullName}</p>
      {address.company && <p>{address.company}</p>}
      <p>{address.line1}</p>
      {address.line2 && <p>{address.line2}</p>}
      <p>
        {address.city}
        {address.state ? `, ${address.state}` : ''} {address.postalCode}
      </p>
      <p>{address.country}</p>
      {address.phone && <p className="text-muted-foreground">{address.phone}</p>}
    </address>
  );
}
