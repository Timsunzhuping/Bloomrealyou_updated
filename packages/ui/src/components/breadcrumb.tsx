import { ChevronRight } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface BreadcrumbItem {
  label: React.ReactNode;
  href?: string;
}

export interface BreadcrumbProps extends React.HTMLAttributes<HTMLElement> {
  items: BreadcrumbItem[];
  /** Accessible label for the breadcrumb nav (i18n). */
  ariaLabel: string;
  /** Render-prop for link items so apps can wire their own router (e.g. next-intl Link). */
  renderLink?: (item: BreadcrumbItem, children: React.ReactNode) => React.ReactNode;
}

export function Breadcrumb({
  items,
  ariaLabel,
  renderLink,
  className,
  ...props
}: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label={ariaLabel} className={cn('text-sm text-muted-foreground', className)} {...props}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const inner = (
            <span
              className={cn(
                'inline-flex items-center',
                isLast ? 'font-medium text-foreground' : 'hover:text-foreground',
              )}
              aria-current={isLast ? 'page' : undefined}
            >
              {item.label}
            </span>
          );
          return (
            <li key={idx} className="inline-flex items-center gap-1.5">
              {item.href && !isLast && renderLink
                ? renderLink(item, inner)
                : item.href && !isLast
                  ? <a href={item.href}>{inner}</a>
                  : inner}
              {!isLast && <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
