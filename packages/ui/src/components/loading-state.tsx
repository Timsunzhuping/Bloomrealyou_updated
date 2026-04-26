import { Loader2 } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visible primary message. */
  label: React.ReactNode;
  /** Optional sub-text. */
  description?: React.ReactNode;
  /** Spinner size in pixels. Default 24. */
  size?: number;
}

export function LoadingState({
  label,
  description,
  size = 24,
  className,
  ...props
}: LoadingStateProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}
      {...props}
    >
      <Loader2 className="animate-spin text-muted-foreground" style={{ width: size, height: size }} />
      <p className="text-sm font-medium">{label}</p>
      {description && <p className="max-w-md text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
