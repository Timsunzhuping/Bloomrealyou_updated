'use client';

import { Globe } from 'lucide-react';

import { cn } from '../lib/cn';

export interface LocaleOption {
  /** Locale code, e.g. "en", "zh-CN". */
  value: string;
  /** Display name in the locale's native language. */
  label: string;
}

export interface LocaleSwitcherProps {
  options: LocaleOption[];
  value: string;
  onChange: (next: string) => void;
  /** Visually-hidden / leading label used for screen readers and the prefix text. */
  label: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Simple, render-anywhere locale picker. The actual routing is left to the
 * caller (e.g. next-intl's router.replace). This component is purely UI.
 */
export function LocaleSwitcher({
  options,
  value,
  onChange,
  label,
  className,
  disabled,
}: LocaleSwitcherProps): JSX.Element {
  return (
    <label className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
