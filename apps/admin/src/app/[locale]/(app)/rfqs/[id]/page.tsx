import { isSupportedLocale, type Locale } from '@custom-merch/i18n';

import type { QuoteDto, RfqDto } from '@custom-merch/shared';

import {
  Badge,
  Button,
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
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { CreateQuoteForm } from '@/components/rfqs/create-quote-form';
import { StatusUpdateForm } from '@/components/rfqs/status-update-form';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export default async function AdminRFQDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');
  const tRfq = await getTranslations('rfq');

  const api = await getAdminApi();
  let rfq: RfqDto;
  try {
    rfq = await api.adminRfqs.get(id);
  } catch {
    notFound();
  }

  let quotes: QuoteDto[] = [];
  try {
    const result = await api.adminQuotes.list({ rfqId: id });
    quotes = result.items;
  } catch {
    // best-effort; the page still works without the quote list.
  }

  return (
    <section className="space-y-6">
      <Link href="/rfqs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('rfqs.detail.back')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('rfqs.detail.heading', { number: rfq.rfqNumber })}
        </h1>
        <Badge variant="secondary">{tRfq(`statusLabels.${rfq.status}`)}</Badge>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{rfq.companyName}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <Field label={t('rfqs.detail.contact')} value={rfq.contactName} />
              <Field label={t('rfqs.detail.email')} value={rfq.email} mono />
              <Field label={t('rfqs.detail.phone')} value={rfq.phone ?? '—'} mono />
              <Field label={t('rfqs.detail.country')} value={rfq.country} mono />
              <Field
                label={t('rfqs.detail.categories')}
                value={rfq.productCategories
                  .map((c) => tRfq(`categoryLabels.${c}`))
                  .join(', ')}
              />
              <Field label={t('rfqs.detail.quantity')} value={rfq.estimatedQuantity.toString()} />
              <Field
                label={t('rfqs.detail.delivery')}
                value={rfq.targetDeliveryDate ? new Date(rfq.targetDeliveryDate).toLocaleDateString(locale) : '—'}
              />
              <Field
                label={t('rfqs.detail.budget')}
                value={tRfq(`budgetRanges.${rfq.budgetRange}`)}
              />
              <Field
                label={t('rfqs.detail.needSample')}
                value={rfq.needSample ? t('rfqs.detail.yes') : t('rfqs.detail.no')}
              />
            </dl>

            {rfq.note && (
              <div className="mt-6 space-y-1 text-sm">
                <p className="font-medium">{t('rfqs.detail.note')}</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{rfq.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('rfqs.detail.logo')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {rfq.logoFileUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rfq.logoFileUrl}
                  alt={rfq.logoFileName ?? rfq.companyName}
                  className="max-h-48 rounded border bg-background object-contain p-2"
                />
                <Button asChild variant="outline" size="sm">
                  <a href={rfq.logoFileUrl} download={rfq.logoFileName ?? 'logo'}>
                    {t('rfqs.detail.downloadLogo')}
                  </a>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">{t('rfqs.detail.noLogo')}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('rfqs.detail.updateStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusUpdateForm rfqId={rfq.id} currentStatus={rfq.status} apiBaseUrl={PUBLIC_API_BASE_URL} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('rfqs.detail.createdQuotes')}</CardTitle>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('rfqs.detail.noQuotes')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('quotes.table.quoteNumber')}</TableHead>
                  <TableHead>{t('quotes.table.items')}</TableHead>
                  <TableHead>{t('quotes.table.total')}</TableHead>
                  <TableHead>{t('quotes.table.status')}</TableHead>
                  <TableHead>{t('quotes.table.createdAt')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <Link href={`/quotes/${q.id}`} className="font-medium">
                        {q.quoteNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{q.items.length}</TableCell>
                    <TableCell className="tabular-nums">
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
          )}
        </CardContent>
      </Card>

      <CreateQuoteForm rfqId={rfq.id} apiBaseUrl={PUBLIC_API_BASE_URL} />
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</dd>
    </div>
  );
}
