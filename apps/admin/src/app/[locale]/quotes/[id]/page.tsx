import { isSupportedLocale, type Locale } from '@custom-merch/i18n';

import type { QuoteDto } from '@custom-merch/shared';

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
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { QuoteActions } from '@/components/quotes/quote-actions';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

function fmtMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export default async function AdminQuoteDetailPage({ params }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let quote: QuoteDto;
  try {
    quote = await getAdminApi().adminQuotes.get(id);
  } catch {
    notFound();
  }

  const currency = quote.total.currency;
  const alreadyConverted = quote.status === 'converted_to_order';

  return (
    <section className="space-y-6">
      <Link
        href="/quotes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t('quotes.detail.back')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {t('quotes.detail.heading', { number: quote.quoteNumber })}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{t(`quotes.statusLabels.${quote.status}`)}</Badge>
          <span>·</span>
          <span>{quote.companyName}</span>
          <span>·</span>
          <span className="font-mono">{quote.customerEmail}</span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('quotes.detail.items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('rfqs.createQuote.description')}</TableHead>
                  <TableHead className="text-end">{t('rfqs.createQuote.quantity')}</TableHead>
                  <TableHead className="text-end">{t('rfqs.createQuote.unitPrice')}</TableHead>
                  <TableHead className="text-end">{t('quotes.detail.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.description}</div>
                      {item.category && (
                        <div className="text-xs text-muted-foreground">{item.category}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-end tabular-nums">
                      {fmtMoney(item.unitPrice.amountMinor, currency)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {fmtMoney(item.lineTotal.amountMinor, currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('quotes.detail.totals')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('quotes.detail.subtotal')} value={fmtMoney(quote.subtotal.amountMinor, currency)} />
            <Row label={t('quotes.detail.shipping')} value={fmtMoney(quote.shipping.amountMinor, currency)} />
            <Row label={t('quotes.detail.tax')} value={fmtMoney(quote.tax.amountMinor, currency)} />
            <Row label={t('quotes.detail.discount')} value={`− ${fmtMoney(quote.discount.amountMinor, currency)}`} />
            <div className="my-2 border-t" />
            <Row
              label={t('quotes.detail.total')}
              value={fmtMoney(quote.total.amountMinor, currency)}
              bold
            />
            {quote.validUntil && (
              <p className="pt-3 text-xs text-muted-foreground">
                {t('quotes.detail.validUntil')}: {new Date(quote.validUntil).toLocaleDateString(locale)}
              </p>
            )}
            {quote.internalNotes && (
              <div className="pt-3 text-xs">
                <p className="font-medium">{t('quotes.detail.internalNotes')}</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{quote.internalNotes}</p>
              </div>
            )}
            {quote.convertedOrderId && (
              <p className="pt-3 text-xs text-emerald-700">
                Order id: <span className="font-mono">{quote.convertedOrderId}</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-6">
          <QuoteActions
            quoteId={quote.id}
            currentStatus={quote.status}
            alreadyConverted={alreadyConverted}
            apiBaseUrl={PUBLIC_API_BASE_URL}
          />
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
