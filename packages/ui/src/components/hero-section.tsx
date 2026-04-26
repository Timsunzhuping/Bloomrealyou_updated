import { cn } from '../lib/cn';

import type * as React from 'react';


export interface HeroSectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Visual element rendered to the right of the copy at md+. */
  visual?: React.ReactNode;
  /** Optional row of trust signals / mini-stats below the CTA. */
  metrics?: React.ReactNode;
}

export function HeroSection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  visual,
  metrics,
  className,
  ...props
}: HeroSectionProps): JSX.Element {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-gradient-to-br from-background via-background to-muted/40',
        className,
      )}
      {...props}
    >
      <div className="grid gap-10 px-6 py-12 md:grid-cols-2 md:px-12 md:py-16">
        <div className="space-y-6">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{eyebrow}</p>
          )}
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{title}</h1>
          {description && (
            <p className="max-w-xl text-base text-muted-foreground md:text-lg">{description}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {primaryAction}
            {secondaryAction}
          </div>
          {metrics && <div className="pt-6">{metrics}</div>}
        </div>
        {visual && (
          <div className="flex items-center justify-center">{visual}</div>
        )}
      </div>
    </section>
  );
}
