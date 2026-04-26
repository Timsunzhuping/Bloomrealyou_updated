import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminShipmentDto } from '@custom-merch/shared';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@custom-merch/ui';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { ShipmentEditForm } from '@/components/shipments/shipment-edit-form';
import { Link } from '@/i18n/navigation';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminShipmentDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let shipment: AdminShipmentDto;
  try {
    const api = await getAdminApi();
    shipment = await api.adminShipments.get(id);
  } catch {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        href="/shipments"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('shipments.actions.backToList')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{shipment.shipmentNumber}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{t(`shipments.statusLabels.${shipment.status}`)}</Badge>
          <span className="font-mono text-xs">
            <Link href={`/orders/${shipment.orderId}`} className="hover:text-foreground">
              {shipment.orderNumber}
            </Link>
          </span>
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('shipments.detail.summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label={t('shipments.detail.carrier')} value={shipment.carrier ?? '—'} />
            <Field
              label={t('shipments.detail.trackingNumber')}
              value={shipment.trackingNumber ?? '—'}
              mono
            />
            <Field
              label={t('shipments.detail.trackingUrl')}
              value={shipment.trackingUrl ?? '—'}
              link={shipment.trackingUrl ?? undefined}
              mono
            />
            <Field
              label={t('shipments.detail.shippingMethod')}
              value={shipment.shippingMethod ?? '—'}
            />
            <Field
              label={t('shipments.detail.shippingCost')}
              value={
                shipment.shippingCost
                  ? `${(shipment.shippingCost.amountMinor / 100).toFixed(2)} ${shipment.shippingCost.currency}`
                  : '—'
              }
            />
            <Field
              label={t('shipments.detail.shippedAt')}
              value={shipment.shippedAt ? new Date(shipment.shippedAt).toLocaleString(locale) : '—'}
            />
            <Field
              label={t('shipments.detail.estimatedDeliveryAt')}
              value={
                shipment.estimatedDeliveryAt
                  ? new Date(shipment.estimatedDeliveryAt).toLocaleString(locale)
                  : '—'
              }
            />
            <Field
              label={t('shipments.detail.deliveredAt')}
              value={
                shipment.deliveredAt ? new Date(shipment.deliveredAt).toLocaleString(locale) : '—'
              }
            />
            <Field
              label={t('shipments.detail.productionJobs')}
              value={shipment.productionJobIds.join(', ') || '—'}
              mono
            />
            <Field
              label={t('shipments.detail.weight')}
              value={shipment.packageWeightGrams ? `${shipment.packageWeightGrams}g` : '—'}
            />
          </dl>
          {shipment.notes && (
            <div className="mt-4 rounded border bg-muted/30 p-3 text-xs">
              <p className="font-medium">{t('shipments.detail.notes')}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{shipment.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ShipmentEditForm shipment={shipment} apiBaseUrl={getApiBaseUrl()} />
    </section>
  );
}

function Field({
  label,
  value,
  mono,
  link,
}: {
  label: string;
  value: string;
  mono?: boolean;
  link?: string;
}): JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={`flex items-center gap-1 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {value}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
