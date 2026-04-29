'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { findActiveMenuItem } from '@/lib/menu';

/**
 * Sub-md replacement for the breadcrumb. Logic:
 *
 *   - On the dashboard or any section root (`/orders`, `/rfqs`, …), nothing
 *     is shown — there's nowhere up.
 *   - On a detail page (`/orders/abc`), renders a "Back" button that
 *     navigates to the section root (`/orders`). We avoid `router.back()`
 *     because it can stack-jump unexpectedly when the user landed via a
 *     direct link.
 */
export function MobileBackButton(): JSX.Element | null {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const active = React.useMemo(() => findActiveMenuItem(pathname), [pathname]);

  if (!active) return null;
  const isDetail = pathname !== active.href && pathname.startsWith(`${active.href}/`);
  if (!isDetail) return null;

  return (
    <Link
      href={active.href}
      aria-label={t('shell.back')}
      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      <span className="text-xs font-medium">{t(`nav.${active.labelKey}`)}</span>
    </Link>
  );
}
