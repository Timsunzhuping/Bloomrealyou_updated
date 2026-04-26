import { cn } from '../lib/cn';

import type * as React from 'react';


export interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo / brand element (e.g. <Link>Brand</Link>). */
  brand: React.ReactNode;
  /** Primary nav. Apps decide whether to render plain links or a <MegaMenu />. */
  nav?: React.ReactNode;
  /** Right-aligned actions: cart, search, account, locale switcher, etc. */
  actions?: React.ReactNode;
  /** Render-prop slot for an optional second row (e.g. announcement bar). */
  topBar?: React.ReactNode;
  sticky?: boolean;
}

export function Header({
  brand,
  nav,
  actions,
  topBar,
  sticky,
  className,
  ...props
}: HeaderProps): JSX.Element {
  return (
    <header
      className={cn(
        'border-b bg-background/80 backdrop-blur',
        sticky && 'sticky top-0 z-30',
        className,
      )}
      {...props}
    >
      {topBar && (
        <div className="border-b bg-foreground text-background">
          <div className="container py-2 text-xs">{topBar}</div>
        </div>
      )}
      <div className="container flex h-16 items-center justify-between gap-6">
        <div className="flex items-center gap-6">{brand}</div>
        {nav && <nav className="hidden flex-1 items-center gap-6 text-sm md:flex">{nav}</nav>}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
