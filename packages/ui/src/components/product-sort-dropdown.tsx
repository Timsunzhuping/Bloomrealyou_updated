'use client';

import { ArrowDownUp } from 'lucide-react';


import { cn } from '../lib/cn';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select';

import type * as React from 'react';

export interface SortOption {
  value: string;
  label: React.ReactNode;
}

export interface ProductSortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (next: string) => void;
  /** Visible "Sort by" label / placeholder (i18n). */
  label: string;
  className?: string;
}

export function ProductSortDropdown({
  options,
  value,
  onChange,
  label,
  className,
}: ProductSortDropdownProps): JSX.Element {
  return (
    <div className={cn('inline-flex items-center gap-2 text-sm', className)}>
      <ArrowDownUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <span className="hidden text-muted-foreground md:inline">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-[180px]" aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
