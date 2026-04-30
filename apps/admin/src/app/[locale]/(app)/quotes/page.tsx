import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  QUOTE_STATUSES,
  type QuoteDto,
  type QuoteStatus,
} from '@custom-merch/shared';
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

import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminQuotesPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const { status } = await searchParams;
  const statusFilter = (QUOTE_STATUSES as readonly string[]).includes(status ?? '')
    ? (status as QuoteStatus)
    : undefined;

  const t = await getTranslations('admin');

  let rows: QuoteDto[] = [];
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminQuotes.list({ status: statusFilter });
    rows = result.items;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('quotes.listHeading')}</h1>
        <p className="text-muted-foreground">{t('quotes.listSubtitle')}</p>
      </header>

      <form className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label htmlFor="status" className="font-medium">
          {t('quotes.filterLabel')}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded border border-input bg-background px-2 py-1 text-sm"
        >
          <option value="">{t('quotes.filterAll')}</option>
          {QUOTE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`quotes.statusLabels.${s}`)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded border border-input bg-background px-3 py-1 text-sm font-medium hover:bg-muted"
        >
          ↻
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
            {t('quotes.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('quotes.table.quoteNumber')}</TableHead>
                <TableHead>{t('quotes.table.rfq')}</TableHead>
                <TableHead>{t('quotes.table.customer')}</TableHead>
                <TableHead className="text-end">{t('quotes.table.items')}</TableHead>
                <TableHead className="text-end">{t('quotes.table.total')}</TableHead>
                <TableHead>{t('quotes.table.status')}</TableHead>
                <TableHead>{t('quotes.table.createdAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium">
                    <Link href={`/quotes/${q.id}`}>{q.quoteNumber}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {q.rfqId ? (
                      <Link href={`/rfqs/${q.rfqId}`}>{q.rfqId.slice(0, 8)}…</Link>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell>{q.customerName} · {q.companyName}</TableCell>
                  <TableCell className="text-end tabular-nums">{q.items.length}</TableCell>
                  <TableCell className="text-end tabular-nums">
                    {(q.total.amountMinor / 100).toFixed(2)} {q.total.currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`quotes.statusLabels.${q.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(q.createdAt).toLocaleString(locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
