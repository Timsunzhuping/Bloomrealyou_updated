'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

interface Props {
  page: number;
  pageSize: number;
  total: number;
  /** Existing query params to preserve when paging. */
  params?: Record<string, string | undefined>;
}

/**
 * Server-component-friendly pagination bar. Each link is a fresh URL so the
 * server-side data fetch re-runs naturally; no client state is needed.
 */
export function PaginationBar({ page, pageSize, total, params = {} }: Props): JSX.Element | null {
  const t = useTranslations('admin.shared.pagination');
  const pathname = usePathname();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const buildHref = (nextPage: number): string => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
    search.set('page', String(nextPage));
    return `${pathname}?${search.toString()}`;
  };

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <p className="text-muted-foreground">
        {t('range', { start, end, total })}
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1)}
            className="inline-flex h-8 items-center gap-1 rounded border bg-background px-2 hover:bg-muted"
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            {t('previous')}
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center gap-1 rounded border bg-muted/30 px-2 text-muted-foreground">
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
            {t('previous')}
          </span>
        )}
        <span className="px-2 text-xs text-muted-foreground">
          {t('pageOf', { page, total: totalPages })}
        </span>
        {page < totalPages ? (
          <Link
            href={buildHref(page + 1)}
            className="inline-flex h-8 items-center gap-1 rounded border bg-background px-2 hover:bg-muted"
          >
            {t('next')}
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </Link>
        ) : (
          <span className="inline-flex h-8 items-center gap-1 rounded border bg-muted/30 px-2 text-muted-foreground">
            {t('next')}
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
