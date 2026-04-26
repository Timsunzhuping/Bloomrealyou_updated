
import { cn } from '../lib/cn';

import { PriceDisplay } from './price-display';

import type * as React from 'react';

export interface ProductCardProps extends React.HTMLAttributes<HTMLElement> {
  /** Localized product name. */
  name: React.ReactNode;
  /** Pre-formatted starting price string (caller handles i18n via formatCurrency). */
  priceLabel: string;
  /** Optional "From X" prefix supplied by caller for i18n. */
  pricePrefix?: string;
  imageSrc?: string;
  imageAlt?: string;
  /** Marketing badge slot (e.g. <ProductBadge /> "Bestseller"). */
  badge?: React.ReactNode;
  /** Footer slot for actions (e.g. <Button>Customize</Button>). */
  footer?: React.ReactNode;
}

export function ProductCard({
  name,
  priceLabel,
  pricePrefix,
  imageSrc,
  imageAlt,
  badge,
  footer,
  className,
  ...props
}: ProductCardProps): JSX.Element {
  return (
    <article
      className={cn(
        'group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md',
        className,
      )}
      {...props}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt ?? ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {badge && <div className="absolute start-3 top-3">{badge}</div>}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2">{name}</h3>
        <PriceDisplay amount={priceLabel} prefix={pricePrefix} size="md" />
        {footer && <div className="mt-auto">{footer}</div>}
      </div>
    </article>
  );
}
