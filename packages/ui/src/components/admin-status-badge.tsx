import { Badge, type BadgeProps } from './badge';

import type * as React from 'react';


/**
 * Generic status pill for back-office records: Production jobs, Shipments,
 * Designs, RFQs, Quotes, Suppliers, etc. Caller maps domain status -> tone +
 * label.
 */
export type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'destructive' | 'accent';

const TONE_TO_VARIANT: Record<StatusTone, BadgeProps['variant']> = {
  neutral: 'secondary',
  info: 'info',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
  accent: 'accent',
};

export interface AdminStatusBadgeProps extends Omit<BadgeProps, 'variant' | 'children'> {
  tone: StatusTone;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

export function AdminStatusBadge({
  tone,
  label,
  icon,
  className,
  ...props
}: AdminStatusBadgeProps): JSX.Element {
  return (
    <Badge variant={TONE_TO_VARIANT[tone]} className={className} {...props}>
      <span className="inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
    </Badge>
  );
}
