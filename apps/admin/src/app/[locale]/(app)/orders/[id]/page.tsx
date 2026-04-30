import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminOrderSummary } from '@custom-merch/sdk';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { AlertTriangle, ArrowLeft, FileDown, Image as ImageIcon } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CreateProductionJobs } from '@/components/orders/create-production-jobs';
import { OrderActions } from '@/components/orders/order-actions';
import { Link } from '@/i18n/navigation';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

function fmtMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export default async function AdminOrderDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let order: AdminOrderSummary;
  try {
    const api = await getAdminApi();
    order = await api.adminOrders.get(id);
  } catch {
    notFound();
  }

  const currency = order.total.currency;

  return (
    <section className="space-y-6">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('orders.actions.backToList')}
      </Link>

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          {order.orderNumber}
          {order.isFlaggedException && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
              {t('orders.detail.flagged')}
            </span>
          )}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{t(`orders.statusLabels.${order.status}`)}</Badge>
          <span className="font-mono">{order.customerEmail ?? '—'}</span>
          <span>·</span>
          <span>{new Date(order.placedAt).toLocaleString(locale)}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('orders.detail.items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('orders.detail.product')}</TableHead>
                  <TableHead className="text-end">{t('orders.detail.quantity')}</TableHead>
                  <TableHead className="text-end">{t('orders.detail.unitPrice')}</TableHead>
                  <TableHead className="text-end">{t('orders.detail.lineTotal')}</TableHead>
                  <TableHead>{t('orders.detail.assets')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.productNameSnapshot}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {item.variantSkuSnapshot}
                      </div>
                      {Object.keys(item.variantAttributesSnapshot).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(item.variantAttributesSnapshot).map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {fmtMoney(item.unitPrice.amountMinor, currency)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {fmtMoney(item.totalPrice.amountMinor, currency)}
                    </TableCell>
                    <TableCell className="space-y-1 text-xs">
                      {item.previewImageUrl ? (
                        <a
                          href={item.previewImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('orders.detail.preview')}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {item.productionFileUrl ? (
                        <div>
                          <a
                            href={item.productionFileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <FileDown className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('orders.detail.productionFile')}
                          </a>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('orders.detail.totals')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('orders.detail.subtotal')} value={fmtMoney(order.subtotal.amountMinor, currency)} />
            <Row label={t('orders.detail.shipping')} value={fmtMoney(order.shipping.amountMinor, currency)} />
            <Row label={t('orders.detail.tax')} value={fmtMoney(order.tax.amountMinor, currency)} />
            <Row
              label={t('orders.detail.discount')}
              value={`− ${fmtMoney(order.discount.amountMinor, currency)}`}
            />
            <div className="my-2 border-t" />
            <Row label={t('orders.detail.total')} value={fmtMoney(order.total.amountMinor, currency)} bold />

            <div className="mt-4 space-y-1 text-xs">
              <p className="font-medium">{t('orders.detail.shippingAddress')}</p>
              <p className="text-muted-foreground">
                {order.shippingAddress.fullName}
                <br />
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                {order.shippingAddress.postalCode}
                <br />
                {order.shippingAddress.country}
              </p>
            </div>
            {order.notes && (
              <div className="mt-3 rounded border bg-muted/30 p-2 text-xs">
                <p className="font-medium">{t('orders.detail.customerNote')}</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <OrderActions order={order} apiBaseUrl={getApiBaseUrl()} />

      <CreateProductionJobs order={order} apiBaseUrl={getApiBaseUrl()} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('orders.detail.internalNotes')}</CardTitle>
        </CardHeader>
        <CardContent>
          {order.internalNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('orders.detail.noInternalNotes')}</p>
          ) : (
            <ul className="space-y-3">
              {order.internalNotes.map((note) => (
                <li key={note.id} className="rounded border bg-muted/30 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {note.authorName} · {new Date(note.createdAt).toLocaleString(locale)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{note.body}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}): JSX.Element {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold' : ''}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
