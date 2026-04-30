import { cn } from '../lib/cn';

import type * as React from 'react';


export interface FooterColumn {
  heading: React.ReactNode;
  links: Array<{ label: React.ReactNode; href: string }>;
}

export interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  brand?: React.ReactNode;
  /** Tagline / mission statement displayed under the brand. */
  tagline?: React.ReactNode;
  columns: FooterColumn[];
  /** Slot for the bottom strip (copyright, legal links). */
  bottom?: React.ReactNode;
  /** Render-prop for link tags (e.g. next-intl Link). Defaults to <a>. */
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
}

export function Footer({
  brand,
  tagline,
  columns,
  bottom,
  renderLink,
  className,
  ...props
}: FooterProps): JSX.Element {
  function link(href: string, children: React.ReactNode): React.ReactNode {
    if (renderLink) return renderLink(href, children);
    return <a href={href}>{children}</a>;
  }

  return (
    <footer className={cn('mt-16 border-t bg-muted/30', className)} {...props}>
      <div className="container grid gap-10 py-12 md:grid-cols-[2fr_repeat(auto-fit,minmax(140px,1fr))]">
        <div className="space-y-3">
          {brand && <div className="text-base font-semibold">{brand}</div>}
          {tagline && <p className="max-w-sm text-sm text-muted-foreground">{tagline}</p>}
        </div>
        {columns.map((col, i) => (
          <div key={i} className="space-y-3">
            <h3 className="text-sm font-semibold">{col.heading}</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {col.links.map((l, j) => (
                <li key={j}>{link(l.href, l.label)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {bottom && (
        <div className="border-t">
          <div className="container flex flex-col items-start justify-between gap-3 py-4 text-xs text-muted-foreground md:flex-row md:items-center">
            {bottom}
          </div>
        </div>
      )}
    </footer>
  );
}
