import { cn } from '../lib/cn';

import type * as React from 'react';


export interface CategoryCardProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  /** Localized category name. */
  title: React.ReactNode;
  /** Localized short blurb. */
  subtitle?: React.ReactNode;
  /** Hero image for the category. */
  imageSrc?: string;
  /** Alt text for the image (required when imageSrc is provided). */
  imageAlt?: string;
  /** Optional accessory (badge, icon) shown in the corner. */
  accessory?: React.ReactNode;
}

export function CategoryCard({
  title,
  subtitle,
  imageSrc,
  imageAlt,
  accessory,
  className,
  ...props
}: CategoryCardProps): JSX.Element {
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md',
        className,
      )}
      {...props}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {imageSrc && (
          <img
            src={imageSrc}
            alt={imageAlt ?? ''}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        {accessory && <div className="absolute end-3 top-3">{accessory}</div>}
      </div>
      <div className="space-y-1 p-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </article>
  );
}
