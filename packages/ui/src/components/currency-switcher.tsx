'use client';

import { CircleDollarSign } from 'lucide-react';

import { cn } from '../lib/cn';

export interface CurrencyOption {
  /** ISO-4217 code, e.g. "USD". */
  value: string;
  /** Localized display label, e.g. "USD — US Dollar". */
  label: string;
}

export interface CurrencySwitcherProps {
  options: CurrencyOption[];
  value: string;
  onChange: (next: string) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}

export function CurrencySwitcher({
  options,
  value,
  onChange,
  label,
  className,
  disabled,
}: CurrencySwitcherProps): JSX.Element {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <CircleDollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only md:not-sr-only md:text-muted-foreground">{label}</span>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
