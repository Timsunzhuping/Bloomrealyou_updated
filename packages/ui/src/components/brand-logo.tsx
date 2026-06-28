import { cn } from '../lib/cn';

import type * as React from 'react';

export interface BrandLogoProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
  showText?: boolean;
  markSize?: number;
  markClassName?: string;
  textClassName?: string;
}

export function BrandLogo({
  label = 'Bloomrealyou',
  showText = true,
  markSize = 40,
  markClassName,
  textClassName,
  className,
  ...props
}: BrandLogoProps): JSX.Element {
  return (
    <span
      className={cn('inline-flex min-w-0 items-center gap-2', className)}
      aria-label={label}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn('shrink-0 bg-no-repeat', markClassName)}
        style={{
          width: markSize,
          height: markSize,
          backgroundImage: "url('/logo.png')",
          backgroundPosition: 'top center',
          backgroundSize: `${markSize * 2}px auto`,
        }}
      />
      {showText && (
        <span className={cn('truncate font-semibold text-foreground', textClassName)}>
          Bloomrealyou
        </span>
      )}
    </span>
  );
}
