import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { ORDER_STATUSES, type OrderStatus } from '@custom-merch/shared';
import type { AdminOrderSummary } from '@custom-merch/sdk';
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
import { AlertTriangle } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string; flaggedOnly?: string; page?: string }>;
}

function fmtMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export default async function AdminOrdersListPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as OrderStatus)
    : undefined;
  const flaggedOnly = sp.flaggedOnly === 'true';
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminOrderSummary[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminOrders.list({ q: sp.q, status, flaggedOnly, page, pageSize: 20 });
    rows = result.items;
    total = result.total;
    pageSize = result.pageSize;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('orders.listHeading')}</h1>
        <p className="text-muted-foreground">{t('orders.listSubtitle')}</p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('orders.filter.search')}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('orders.filter.searchPlaceholder')}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('orders.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('orders.filter.allStatuses')}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`orders.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-end gap-2 pb-1">
          <input type="checkbox" name="flaggedOnly" defaultChecked={flaggedOnly} value="true" />
          <span className="text-xs">{t('orders.filter.flaggedOnly')}</span>
        </label>
        <button
          type="submit"
          className="h-8 rounded border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          {t('orders.filter.apply')}
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
            {t('orders.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('orders.table.orderNumber')}</TableHead>
                <TableHead>{t('orders.table.customer')}</TableHead>
                <TableHead className="text-end">{t('orders.table.items')}</TableHead>
                <TableHead className="text-end">{t('orders.table.total')}</TableHead>
                <TableHead>{t('orders.table.status')}</TableHead>
                <TableHead>{t('orders.table.placedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="inline-flex items-center gap-1">
                      {order.orderNumber}
                      {order.isFlaggedException && (
                        <AlertTriangle
                          className="h-3.5 w-3.5 text-amber-500"
                          aria-label="flagged"
                        />
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {order.customerEmail ?? '—'}
                  </TableCell>
                  <TableCell className="text-end tabular-nums">{order.items.length}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {fmtMoney(order.total.amountMinor, order.total.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`orders.statusLabels.${order.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(order.placedAt).toLocaleString(locale)}
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
        params={{ q: sp.q, status, flaggedOnly: flaggedOnly ? 'true' : undefined }}
      />
    </section>
  );
}
