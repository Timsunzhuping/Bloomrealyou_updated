'use client';

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  /** Current 1-indexed page. */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Called with the next page when the user clicks a page link. */
  onPageChange: (page: number) => void;
  /** Accessible labels (i18n required — no defaults). */
  labels: {
    nav: string;
    previous: string;
    next: string;
    /** Visually-hidden label for "Page {n}" links. Receives the page number. */
    page: (page: number) => string;
  };
  /** Number of sibling pages around the current. Default 1. */
  siblings?: number;
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function buildPages(page: number, totalPages: number, siblings: number): Array<number | 'ellipsis'> {
  const total = Math.max(totalPages, 1);
  const minPage = Math.max(2, page - siblings);
  const maxPage = Math.min(total - 1, page + siblings);
  const showLeftEllipsis = minPage > 2;
  const showRightEllipsis = maxPage < total - 1;

  const items: Array<number | 'ellipsis'> = [1];
  if (showLeftEllipsis) items.push('ellipsis');
  items.push(...range(minPage, maxPage));
  if (showRightEllipsis) items.push('ellipsis');
  if (total > 1) items.push(total);
  return items;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  labels,
  siblings = 1,
  className,
  ...props
}: PaginationProps): JSX.Element {
  const items = buildPages(page, totalPages, siblings);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <nav
      aria-label={labels.nav}
      className={cn('flex items-center justify-center gap-1', className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
        aria-label={labels.previous}
        className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        <span className="sr-only sm:not-sr-only sm:ms-1">{labels.previous}</span>
      </button>
      {items.map((item, idx) =>
        item === 'ellipsis' ? (
          <span key={`e-${idx}`} className="flex h-9 w-9 items-center justify-center text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-current={item === page ? 'page' : undefined}
            aria-label={labels.page(item)}
            onClick={() => onPageChange(item)}
            className={cn(
              'inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors',
              item === page
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-background hover:bg-accent hover:text-accent-foreground',
            )}
          >
            {item}
          </button>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
        aria-label={labels.next}
        className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="sr-only sm:not-sr-only sm:me-1">{labels.next}</span>
        <ChevronRight className="h-4 w-4 rtl:rotate-180" />
      </button>
    </nav>
  );
}
