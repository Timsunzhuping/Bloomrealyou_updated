'use client';

import { ChevronDown } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface FAQItem {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export interface FAQSectionProps extends React.HTMLAttributes<HTMLElement> {
  heading: React.ReactNode;
  description?: React.ReactNode;
  items: FAQItem[];
}

export function FAQSection({
  heading,
  description,
  items,
  className,
  ...props
}: FAQSectionProps): JSX.Element {
  return (
    <section className={cn('space-y-6', className)} {...props}>
      <header className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">{heading}</h2>
        {description && <p className="text-muted-foreground">{description}</p>}
      </header>
      <ul className="divide-y rounded-lg border">
        {items.map((item, i) => (
          <li key={i}>
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 text-sm font-medium hover:bg-muted/50">
                <span>{item.question}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 text-sm text-muted-foreground">{item.answer}</div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}
