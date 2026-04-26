import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  RFQ_STATUSES,
  type RfqDto,
  type RFQStatus,
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

export default async function AdminRFQsPage({ params, searchParams }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const { status } = await searchParams;
  const statusFilter = (RFQ_STATUSES as readonly string[]).includes(status ?? '')
    ? (status as RFQStatus)
    : undefined;

  const t = await getTranslations('admin');
  const tRfq = await getTranslations('rfq');

  let rows: RfqDto[] = [];
  let fetchError: string | null = null;
  try {
    const result = await getAdminApi().adminRfqs.list({ status: statusFilter });
    rows = result.items;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('rfqs.listHeading')}</h1>
        <p className="text-muted-foreground">{t('rfqs.listSubtitle')}</p>
      </header>

      <form className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label htmlFor="status" className="font-medium">
          {t('rfqs.filterLabel')}
        </label>
        <select
          id="status"
          name="status"
          defaultValue={statusFilter ?? ''}
          className="rounded border border-input bg-background px-2 py-1 text-sm"
        >
          <option value="">{t('rfqs.filterAll')}</option>
          {RFQ_STATUSES.map((s) => (
            <option key={s} value={s}>
              {tRfq(`statusLabels.${s}`)}
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
            {t('rfqs.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('rfqs.table.rfqNumber')}</TableHead>
                <TableHead>{t('rfqs.table.company')}</TableHead>
                <TableHead>{t('rfqs.table.contact')}</TableHead>
                <TableHead>{t('rfqs.table.country')}</TableHead>
                <TableHead className="text-end">{t('rfqs.table.qty')}</TableHead>
                <TableHead>{t('rfqs.table.budget')}</TableHead>
                <TableHead>{t('rfqs.table.status')}</TableHead>
                <TableHead>{t('rfqs.table.submittedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rfq) => (
                <TableRow key={rfq.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/rfqs/${rfq.id}`}>{rfq.rfqNumber}</Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/rfqs/${rfq.id}`}>{rfq.companyName}</Link>
                  </TableCell>
                  <TableCell>{rfq.contactName}</TableCell>
                  <TableCell>{rfq.country}</TableCell>
                  <TableCell className="text-end tabular-nums">{rfq.estimatedQuantity}</TableCell>
                  <TableCell>{tRfq(`budgetRanges.${rfq.budgetRange}`)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tRfq(`statusLabels.${rfq.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(rfq.submittedAt).toLocaleString(locale)}
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
