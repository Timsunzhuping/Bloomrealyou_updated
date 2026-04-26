'use client';

import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '@custom-merch/shared';
import {
  ProductFilterSidebar,
  ProductSortDropdown,
  type FilterGroup,
  type SortOption,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

const COLOR_OPTIONS = ['black', 'white', 'navy', 'red', 'forest'] as const;

interface CatalogFiltersProps {
  /** When set, the category filter is hidden because the page is already category-scoped. */
  scopedCategory?: ProductCategory;
  sort: string;
  onSortChange: (next: string) => void;
}

/**
 * Client-side filters/sort controls. Keeps state local for now — wiring to
 * URL query params is a follow-up once the API supports server-side filtering.
 */
export function CatalogFilters({
  scopedCategory,
  sort,
  onSortChange,
}: CatalogFiltersProps): JSX.Element {
  const t = useTranslations('products');
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const groups: FilterGroup[] = [];

  if (!scopedCategory) {
    groups.push({
      key: 'category',
      heading: t('filters.category'),
      options: PRODUCT_CATEGORIES.map((c) => ({
        value: c,
        label: t(`categories.${c}.name`),
      })),
    });
  }

  groups.push({
    key: 'color',
    heading: t('filters.color'),
    options: COLOR_OPTIONS.map((c) => ({ value: c, label: t(`colors.${c}`) })),
  });

  groups.push({
    key: 'printMethod',
    heading: t('filters.printMethod'),
    options: PRINT_METHODS.map((m) => ({ value: m, label: t(`printMethods.${m}`) })),
  });

  const sortOptions: SortOption[] = [
    { value: 'popular', label: t('sortOptions.popular') },
    { value: 'priceAsc', label: t('sortOptions.priceAsc') },
    { value: 'priceDesc', label: t('sortOptions.priceDesc') },
    { value: 'newest', label: t('sortOptions.newest') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <ProductSortDropdown
          value={sort}
          onChange={onSortChange}
          label={t('list.sortBy')}
          options={sortOptions}
        />
      </div>
      <ProductFilterSidebar
        groups={groups}
        selected={selected}
        onToggle={(key, value) =>
          setSelected((prev) => {
            const next = new Set(prev);
            const id = `${key}:${value}`;
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          })
        }
        resetLabel={t('filters.reset')}
        onReset={() => setSelected(new Set())}
      />
    </div>
  );
}
