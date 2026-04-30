import type { OrderTrackingDto } from '@custom-merch/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@custom-merch/ui';
import { ExternalLink, PackageCheck, Truck } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface Props {
  tracking: OrderTrackingDto;
  locale: string;
}

/**
 * Customer-facing tracking strip. Renders one card per shipment with carrier,
 * tracking number (clickable when a URL is present), and timeline dates. We
 * deliberately read from the public `OrderTrackingDto` so internal admin
 * fields (supplier names, internal notes, cost) never leak to the customer.
 */
export async function OrderTrackingSection({ tracking, locale }: Props): Promise<JSX.Element> {
  const t = await getTranslations('account.tracking');

  if (tracking.shipments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('heading')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('emptyForStatus', { status: t(`orderStatus.${tracking.orderStatus}`, { default: tracking.orderStatus }) })}
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('heading')}</h2>
        <p className="text-xs text-muted-foreground">
          {t('lastUpdated', { time: new Date(tracking.lastUpdatedAt).toLocaleString(locale) })}
        </p>
      </header>
      <ul className="space-y-3">
        {tracking.shipments.map((s) => {
          const Icon = s.status === 'delivered' ? PackageCheck : Truck;
          return (
            <li key={s.shipmentNumber} className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="space-y-0.5">
                    <p className="font-medium">{s.carrier ?? t('noCarrier')}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {s.shipmentNumber}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {t(`status.${s.status}`, { default: s.status })}
                </span>
              </div>
              <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <Field label={t('trackingNumber')}>
                  {s.trackingUrl && s.trackingNumber ? (
                    <a
                      href={s.trackingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {s.trackingNumber}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="font-mono">{s.trackingNumber ?? '—'}</span>
                  )}
                </Field>
                <Field label={t('shippingMethod')}>
                  <span>{s.shippingMethod ?? '—'}</span>
                </Field>
                <Field label={t('shippedAt')}>
                  <span>{s.shippedAt ? new Date(s.shippedAt).toLocaleString(locale) : '—'}</span>
                </Field>
                <Field label={t('deliveredAt')}>
                  <span>
                    {s.deliveredAt
                      ? new Date(s.deliveredAt).toLocaleString(locale)
                      : s.estimatedDeliveryAt
                        ? `${t('estimated')} ${new Date(s.estimatedDeliveryAt).toLocaleDateString(locale)}`
                        : '—'}
                  </span>
                </Field>
              </dl>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="space-y-0.5">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}
