'use client';

import { formatCurrency, formatLocalisedDate, type Locale } from '@custom-merch/i18n';
import type { AccountQuoteSummaryDto } from '@custom-merch/shared';
import { Button, EmptyState, ErrorState, LoadingState } from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

export function AccountQuotesList({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('account.quotes');
  const tCommon = useTranslations('common');
  const [quotes, setQuotes] = React.useState<AccountQuoteSummaryDto[] | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getClientApi().account.listQuotes();
        if (!cancelled) setQuotes(list);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState title={t('empty')} />;
  if (!quotes) return <LoadingState label={tCommon('states.loading')} />;
  if (quotes.length === 0) {
    return (
      <EmptyState
        title={t('empty')}
        action={
          <Button asChild>
            <Link href="/business">{t('newRfq')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {quotes.map((q) => (
        <li
          key={q.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4 text-sm"
        >
          <div>
            <p className="font-medium">{q.quoteNumber}</p>
            <p className="text-xs text-muted-foreground">
              {q.validUntil ? formatLocalisedDate(q.validUntil, locale, 'long-date') : '—'}
            </p>
          </div>
          <span className="rounded-full border px-2.5 py-0.5 text-xs">{q.status}</span>
          <p className="font-semibold">
            {formatCurrency({ amountMinor: q.total.amountMinor, currency: q.total.currency as never }, locale)}
          </p>
        </li>
      ))}
    </ul>
  );
}
