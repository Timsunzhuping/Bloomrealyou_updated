import * as React from 'react';

import { cn } from '../lib/cn';

import { Label } from './label';

export interface FormFieldProps {
  /** id used by both <label htmlFor> and the rendered control. Required for a11y. */
  id: string;
  label: React.ReactNode;
  /** Optional helper text rendered below the input. */
  description?: React.ReactNode;
  /** Validation error. When set, the field is rendered in error state. */
  error?: React.ReactNode;
  /** Optional badge / suffix on the same row as the label (e.g. "Optional"). */
  hint?: React.ReactNode;
  className?: string;
  required?: boolean;
  children: React.ReactElement;
}

/**
 * Wrapper that pairs a label with an input control and renders description /
 * error text. Children must accept `id` and `aria-*` props (most native inputs
 * and Radix primitives do).
 */
export function FormField({
  id,
  label,
  description,
  error,
  hint,
  required,
  className,
  children,
}: FormFieldProps): JSX.Element {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  const control = React.cloneElement(children, {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
  });

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>
          {label}
          {required && <span className="ms-0.5 text-destructive">*</span>}
        </Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {control}
      {description && (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
