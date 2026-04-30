import { cn } from '../lib/cn';

import type * as React from 'react';


export interface PriceDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Current price formatted by the caller (e.g. via formatCurrency). */
  amount: string;
  /** Optional comparison price; rendered struck-through. */
  compareAtAmount?: string;
  /** Optional badge string (e.g. "From"). The caller controls i18n. */
  prefix?: string;
  /** Optional unit label (e.g. "/ unit"). */
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASS: Record<NonNullable<PriceDisplayProps['size']>, string> = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl font-semibold',
};

export function PriceDisplay({
  amount,
  compareAtAmount,
  prefix,
  suffix,
  size = 'md',
  className,
  ...props
}: PriceDisplayProps): JSX.Element {
  return (
    <span className={cn('inline-flex items-baseline gap-1.5', SIZE_CLASS[size], className)} {...props}>
      {prefix && <span className="text-xs font-normal text-muted-foreground">{prefix}</span>}
      <span className="font-semibold">{amount}</span>
      {compareAtAmount && (
        <span className="text-xs font-normal text-muted-foreground line-through">
          {compareAtAmount}
        </span>
      )}
      {suffix && <span className="text-xs font-normal text-muted-foreground">{suffix}</span>}
    </span>
  );
}
