import { cn } from '../lib/cn';

import type * as React from 'react';


export interface CTASectionProps extends Omit<React.HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Primary action element (e.g. <Button>). */
  primaryAction: React.ReactNode;
  secondaryAction?: React.ReactNode;
  /** Visual tone. */
  tone?: 'default' | 'inverted' | 'accent';
}

const TONE: Record<NonNullable<CTASectionProps['tone']>, string> = {
  default: 'bg-muted/30',
  inverted: 'bg-foreground text-background',
  accent: 'bg-accent text-accent-foreground',
};

export function CTASection({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  tone = 'default',
  className,
  ...props
}: CTASectionProps): JSX.Element {
  return (
    <section
      className={cn(
        'flex flex-col items-start justify-between gap-6 rounded-2xl border p-8 md:flex-row md:items-center md:p-12',
        TONE[tone],
        className,
      )}
      {...props}
    >
      <div className="space-y-2">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider opacity-70">{eyebrow}</p>}
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
        {description && <p className="max-w-xl text-sm opacity-80 md:text-base">{description}</p>}
      </div>
      <div className="flex flex-wrap gap-3">
        {primaryAction}
        {secondaryAction}
      </div>
    </section>
  );
}
