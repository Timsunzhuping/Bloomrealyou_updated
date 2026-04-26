import { cn } from '../lib/cn';

import type * as React from 'react';


export interface CategoryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default 2 / 3 / 6 column responsive grid. Override via className if needed. */
  children: React.ReactNode;
}

export function CategoryGrid({
  children,
  className,
  ...props
}: CategoryGridProps): JSX.Element {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
