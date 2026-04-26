
import { cn } from '../lib/cn';

import { Badge, type BadgeProps } from './badge';

import type * as React from 'react';

/**
 * Status keys mirror the OrderStatus enum from `@custom-merch/shared`. The
 * label is supplied by the caller (i18n) so this component stays UI-only.
 */
export type OrderStatusKey =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

const VARIANT: Record<OrderStatusKey, BadgeProps['variant']> = {
  pending: 'warning',
  paid: 'info',
  in_production: 'info',
  shipped: 'accent',
  delivered: 'success',
  cancelled: 'destructive',
  refunded: 'secondary',
};

export interface OrderStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: OrderStatusKey;
  label: React.ReactNode;
}

export function OrderStatusBadge({
  status,
  label,
  className,
  ...props
}: OrderStatusBadgeProps): JSX.Element {
  return (
    <Badge variant={VARIANT[status]} className={cn(className)} {...props}>
      {label}
    </Badge>
  );
}
