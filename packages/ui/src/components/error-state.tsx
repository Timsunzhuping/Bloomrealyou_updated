import { AlertTriangle } from 'lucide-react';

import { cn } from '../lib/cn';

import type * as React from 'react';


export interface ErrorStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional retry / back action. */
  action?: React.ReactNode;
}

export function ErrorState({
  title,
  description,
  action,
  className,
  ...props
}: ErrorStateProps): JSX.Element {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center',
        className,
      )}
      {...props}
    >
      <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
      <h3 className="text-base font-semibold text-destructive">{title}</h3>
      {description && (
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
