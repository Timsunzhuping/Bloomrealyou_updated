import { Quote } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface TestimonialCardProps extends React.HTMLAttributes<HTMLElement> {
  quote: React.ReactNode;
  authorName: React.ReactNode;
  authorRole?: React.ReactNode;
  avatarSrc?: string;
  /** Visually-hidden quote-icon label, e.g. "Quote". */
  quoteIconLabel?: string;
}

export function TestimonialCard({
  quote,
  authorName,
  authorRole,
  avatarSrc,
  quoteIconLabel,
  className,
  ...props
}: TestimonialCardProps): JSX.Element {
  return (
    <article
      className={cn('flex flex-col gap-4 rounded-lg border bg-card p-6 shadow-sm', className)}
      {...props}
    >
      <Quote className="h-6 w-6 text-primary/60" aria-label={quoteIconLabel} />
      <p className="text-sm leading-relaxed text-foreground">{quote}</p>
      <footer className="mt-auto flex items-center gap-3">
        {avatarSrc && (
          <img
            src={avatarSrc}
            alt=""
            className="h-10 w-10 rounded-full border bg-muted object-cover"
          />
        )}
        <div className="text-sm">
          <p className="font-semibold">{authorName}</p>
          {authorRole && <p className="text-xs text-muted-foreground">{authorRole}</p>}
        </div>
      </footer>
    </article>
  );
}
