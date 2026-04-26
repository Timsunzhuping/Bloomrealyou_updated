import { cn } from '../lib/cn';

import type * as React from 'react';


export interface TrustBarItem {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface TrustBarProps extends React.HTMLAttributes<HTMLDivElement> {
  items: TrustBarItem[];
}

export function TrustBar({ items, className, ...props }: TrustBarProps): JSX.Element {
  return (
    <section
      className={cn(
        'grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 md:grid-cols-4',
        className,
      )}
      {...props}
    >
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-3">
          {item.icon && <div className="text-primary">{item.icon}</div>}
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            {item.description && (
              <p className="text-xs text-muted-foreground">{item.description}</p>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
