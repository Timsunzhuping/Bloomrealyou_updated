
import { cn } from '../lib/cn';

import { Badge, type BadgeProps } from './badge';

import type * as React from 'react';

/**
 * Marketing-style product flag, e.g. "New", "Bestseller", "Eco-friendly".
 * Caller controls the label entirely (i18n compliant).
 */
export interface ProductBadgeProps extends Omit<BadgeProps, 'children'> {
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export function ProductBadge({ label, icon, className, ...props }: ProductBadgeProps): JSX.Element {
  return (
    <Badge className={cn('gap-1', className)} {...props}>
      {icon}
      {label}
    </Badge>
  );
}
