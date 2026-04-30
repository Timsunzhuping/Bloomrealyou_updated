import { cn } from '../lib/cn';

import type * as React from 'react';


export interface TemplateGridItem {
  id: string;
  title: React.ReactNode;
  /** Subtitle / scenario, e.g. "Tech conference". */
  subtitle?: React.ReactNode;
  imageSrc?: string;
  imageAlt?: string;
  /** Optional badge slot. */
  badge?: React.ReactNode;
  /** Wrap-the-card link ref (caller chooses next-intl Link or anchor). */
  href?: string;
}

export interface TemplateGridProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TemplateGridItem[];
  /** Render-prop wrapping each card with a router-aware link. */
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

export function TemplateGrid({
  items,
  renderLink,
  className,
  ...props
}: TemplateGridProps): JSX.Element {
  function wrap(item: TemplateGridItem, content: React.ReactNode): React.ReactNode {
    if (!item.href) return content;
    if (renderLink) return renderLink(item.href, content);
    return <a href={item.href}>{content}</a>;
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)} {...props}>
      {items.map((item) => (
        <article
          key={item.id}
          className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm transition-all hover:shadow-md"
        >
          {wrap(
            item,
            <>
              <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                {item.imageSrc && (
                  <img
                    src={item.imageSrc}
                    alt={item.imageAlt ?? ''}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                {item.badge && <div className="absolute end-3 top-3">{item.badge}</div>}
              </div>
              <div className="space-y-1 p-4">
                <h3 className="text-sm font-semibold">{item.title}</h3>
                {item.subtitle && (
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                )}
              </div>
            </>,
          )}
        </article>
      ))}
    </div>
  );
}
