import { Building2 } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface CorporateCTAProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Quick checklist of B2B capabilities (icon + label per item). */
  bullets?: Array<{ icon?: React.ReactNode; label: React.ReactNode }>;
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export function CorporateCTA({
  eyebrow,
  title,
  description,
  bullets,
  primaryAction,
  secondaryAction,
  className,
  ...props
}: CorporateCTAProps): JSX.Element {
  return (
    <section
      className={cn(
        'grid items-center gap-8 rounded-2xl border bg-foreground p-8 text-background md:grid-cols-2 md:p-12',
        className,
      )}
      {...props}
    >
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <Building2 className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="max-w-xl text-sm opacity-80 md:text-base">{description}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          {primaryAction}
          {secondaryAction}
        </div>
      </div>
      {bullets && bullets.length > 0 && (
        <ul className="grid gap-3 rounded-xl bg-background/5 p-6 sm:grid-cols-2">
          {bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-accent">{b.icon}</span>
              <span>{b.label}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
