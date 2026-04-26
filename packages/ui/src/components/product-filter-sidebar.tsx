'use client';


import { cn } from '../lib/cn';

import { Checkbox } from './checkbox';
import { Label } from './label';

import type * as React from 'react';

export interface FilterOption {
  value: string;
  label: React.ReactNode;
  /** Optional count appended after the label. */
  count?: number;
}

export interface FilterGroup {
  /** Stable group key (e.g. "category", "color", "size"). */
  key: string;
  /** Localized heading. */
  heading: React.ReactNode;
  options: FilterOption[];
}

export interface ProductFilterSidebarProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'onToggle'> {
  groups: FilterGroup[];
  /** Set of selected `${groupKey}:${optionValue}` ids. */
  selected: ReadonlySet<string>;
  onToggle: (groupKey: string, value: string) => void;
  /** Localized "Reset" / "Clear" link copy. */
  resetLabel?: React.ReactNode;
  onReset?: () => void;
}

export function ProductFilterSidebar({
  groups,
  selected,
  onToggle,
  resetLabel,
  onReset,
  className,
  ...props
}: ProductFilterSidebarProps): JSX.Element {
  return (
    <aside className={cn('w-full md:w-64', className)} {...props}>
      <div className="space-y-6 rounded-lg border p-4">
        {resetLabel && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="text-xs font-medium text-primary hover:underline"
          >
            {resetLabel}
          </button>
        )}
        {groups.map((group) => (
          <fieldset key={group.key} className="space-y-2">
            <legend className="text-sm font-semibold">{group.heading}</legend>
            <div className="space-y-2">
              {group.options.map((opt) => {
                const id = `${group.key}-${opt.value}`;
                const checked = selected.has(`${group.key}:${opt.value}`);
                return (
                  <div key={opt.value} className="flex items-center gap-2">
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={() => onToggle(group.key, opt.value)}
                    />
                    <Label htmlFor={id} className="flex-1 cursor-pointer text-sm font-normal">
                      <span>{opt.label}</span>
                      {typeof opt.count === 'number' && (
                        <span className="ms-1 text-xs text-muted-foreground">({opt.count})</span>
                      )}
                    </Label>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </aside>
  );
}
