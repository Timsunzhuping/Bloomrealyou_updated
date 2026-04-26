'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { findActiveMenuItem } from '@/lib/menu';

/**
 * Compact breadcrumb that resolves the active menu item from the URL and
 * renders `<Admin> › <SectionLabel>`. Detail routes (e.g. `/rfqs/:id`) keep
 * the section label and append a generic "Detail" segment so we don't have
 * to thread a labelled crumb through every leaf page.
 */
export function Breadcrumb(): JSX.Element | null {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const active = React.useMemo(() => findActiveMenuItem(pathname), [pathname]);

  if (!active) return null;

  const isDetail = pathname !== active.href && pathname.startsWith(`${active.href}/`);

  return (
    <nav aria-label="Breadcrumb" className="text-xs">
      <ol className="flex items-center gap-1.5 text-muted-foreground">
        <li>
          <Link href="/dashboard" className="hover:text-foreground">
            {t('breadcrumb.home')}
          </Link>
        </li>
        <ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
        <li>
          {isDetail ? (
            <Link href={active.href} className="hover:text-foreground">
              {t(`nav.${active.labelKey}`)}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{t(`nav.${active.labelKey}`)}</span>
          )}
        </li>
        {isDetail && (
          <>
            <ChevronRight className="h-3 w-3 rtl:rotate-180" aria-hidden="true" />
            <li className="font-medium text-foreground" aria-current="page">
              {pathname.split('/').pop()}
            </li>
          </>
        )}
      </ol>
    </nav>
  );
}
