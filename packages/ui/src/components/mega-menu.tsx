'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface MegaMenuLink {
  label: React.ReactNode;
  href: string;
  description?: React.ReactNode;
}

export interface MegaMenuColumn {
  heading: React.ReactNode;
  links: MegaMenuLink[];
}

export interface MegaMenuProps {
  /** Trigger label (e.g. "Products"). */
  label: React.ReactNode;
  columns: MegaMenuColumn[];
  /** Optional CTA shown at the bottom of the panel. */
  footer?: React.ReactNode;
  /** Render-prop for link tags (e.g. next-intl Link). */
  renderLink?: (href: string, children: React.ReactNode) => React.ReactNode;
  className?: string;
}

export function MegaMenu({
  label,
  columns,
  footer,
  renderLink,
  className,
}: MegaMenuProps): JSX.Element {
  function link(href: string, children: React.ReactNode): React.ReactNode {
    if (renderLink) return renderLink(href, children);
    return <a href={href}>{children}</a>;
  }

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        className={cn(
          'inline-flex items-center gap-1 text-sm font-medium hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          className,
        )}
      >
        {label}
        <ChevronDown className="h-3.5 w-3.5" />
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align="start"
          sideOffset={12}
          className="z-40 w-screen max-w-3xl rounded-lg border bg-popover p-6 text-popover-foreground shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            {columns.map((col, i) => (
              <div key={i} className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.heading}
                </h4>
                <ul className="space-y-2">
                  {col.links.map((l, j) => (
                    <li key={j}>
                      {link(
                        l.href,
                        <span className="block">
                          <span className="text-sm font-medium">{l.label}</span>
                          {l.description && (
                            <span className="block text-xs text-muted-foreground">
                              {l.description}
                            </span>
                          )}
                        </span>,
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {footer && <div className="mt-6 border-t pt-4">{footer}</div>}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
