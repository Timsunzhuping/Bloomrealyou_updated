import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { SHIPMENT_STATUSES, type AdminShipmentDto, type ShipmentStatus } from '@custom-merch/shared';
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; orderId?: string; page?: string }>;
}

export default async function AdminShipmentsListPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const status = (SHIPMENT_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as ShipmentStatus)
    : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminShipmentDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminShipments.list({
      q: sp.q,
      status,
      orderId: sp.orderId,
      page,
      pageSize: 20,
    });
    rows = result.items;
    total = result.total;
    pageSize = result.pageSize;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('shipments.listHeading')}</h1>
        <p className="text-muted-foreground">{t('shipments.listSubtitle')}</p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('shipments.filter.search')}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('shipments.filter.searchPlaceholder')}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('shipments.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('shipments.filter.allStatuses')}</option>
            {SHIPMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`shipments.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-8 rounded border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          {t('shipments.filter.apply')}
        </button>
      </form>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('shipments.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('shipments.table.shipmentNumber')}</TableHead>
                <TableHead>{t('shipments.table.order')}</TableHead>
                <TableHead>{t('shipments.table.carrier')}</TableHead>
                <TableHead>{t('shipments.table.tracking')}</TableHead>
                <TableHead>{t('shipments.table.status')}</TableHead>
                <TableHead>{t('shipments.table.shippedAt')}</TableHead>
                <TableHead>{t('shipments.table.deliveredAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/shipments/${s.id}`}>{s.shipmentNumber}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.orderNumber}</TableCell>
                  <TableCell className="text-xs">{s.carrier ?? '—'}</TableCell>
                  <TableCell className="font-mono text-xs">{s.trackingNumber ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {t(`shipments.statusLabels.${s.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.shippedAt ? new Date(s.shippedAt).toLocaleString(locale) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.deliveredAt ? new Date(s.deliveredAt).toLocaleString(locale) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ q: sp.q, status, orderId: sp.orderId }}
      />
    </section>
  );
}
