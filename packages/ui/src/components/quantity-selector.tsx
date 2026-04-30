'use client';

import { Minus, Plus } from 'lucide-react';

import { cn } from '../lib/cn';

export interface QuantitySelectorProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
  /** Accessible labels (i18n required). */
  labels: {
    decrement: string;
    increment: string;
    /** aria-label for the input itself, e.g. "Quantity". */
    input: string;
  };
  className?: string;
  disabled?: boolean;
}

export function QuantitySelector({
  value,
  min = 1,
  max,
  step = 1,
  onChange,
  labels,
  className,
  disabled,
}: QuantitySelectorProps): JSX.Element {
  function clamp(next: number): number {
    let v = next;
    if (Number.isNaN(v)) v = min;
    if (v < min) v = min;
    if (typeof max === 'number' && v > max) v = max;
    return v;
  }

  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-md border border-input bg-background',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-label={labels.decrement}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - step))}
        className="grid h-10 w-10 place-items-center rounded-s-md text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={labels.input}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className="h-10 w-12 border-x bg-transparent text-center text-sm focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={labels.increment}
        disabled={disabled || (typeof max === 'number' && value >= max)}
        onClick={() => onChange(clamp(value + step))}
        className="grid h-10 w-10 place-items-center rounded-e-md text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
