'use client';

import type { AdminUserDto } from '@custom-merch/shared';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, usePathname } from '@/i18n/navigation';
import { findActiveMenuItem, visibleMenuGroups } from '@/lib/menu';

import { MenuIcon } from './icon';

interface Props {
  user: AdminUserDto | null;
}

/**
 * Permission-filtered sidebar. Renders nothing for anonymous users (the layout
 * already redirects them, but defending in depth keeps a logged-out flash from
 * leaking the menu).
 */
export function Sidebar({ user }: Props): JSX.Element | null {
  const t = useTranslations('admin');
  const pathname = usePathname();
  const groups = React.useMemo(() => visibleMenuGroups(user), [user]);
  const active = React.useMemo(() => findActiveMenuItem(pathname), [pathname]);

  if (!user || groups.length === 0) return null;

  return (
    <nav className="hidden w-60 shrink-0 border-e bg-card lg:block" aria-label="Admin navigation">
      <div className="sticky top-0 flex h-screen flex-col gap-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.labelKey} className="mt-3 first:mt-0">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t(`navGroups.${group.labelKey}`)}
            </p>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const isActive = active?.href === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-muted'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <MenuIcon name={item.icon} className="h-4 w-4" />
                      <span>{t(`nav.${item.labelKey}`)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
