import { cn } from '../lib/cn';

import type * as React from 'react';


export interface ProductGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function ProductGrid({ children, className, ...props }: ProductGridProps): JSX.Element {
  return (
    <div
      className={cn(
        'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
