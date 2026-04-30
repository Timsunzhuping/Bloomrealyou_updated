'use client';

import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, usePathname } from '@/i18n/navigation';

const TABS = [
  { key: 'overview', href: '/account' },
  { key: 'orders', href: '/account/orders' },
  { key: 'designs', href: '/account/designs' },
  { key: 'quotes', href: '/account/quotes' },
  { key: 'addresses', href: '/account/addresses' },
  { key: 'profile', href: '/account/profile' },
] as const;

export function AccountShell({ children }: { children: React.ReactNode }): JSX.Element {
  const t = useTranslations('account');
  const pathname = usePathname();

  // Match by exact === for /account, by startsWith for sub-routes.
  const isActive = (href: string): boolean => {
    if (href === '/account') return pathname === '/account';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside>
        <h1 className="mb-4 text-2xl font-bold tracking-tight">{t('title')}</h1>
        <nav aria-label="Account navigation" className="flex flex-row gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={isActive(tab.href) ? 'page' : undefined}
              className={`rounded-md px-3 py-2 text-sm transition-colors ${
                isActive(tab.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {t(`tabs.${tab.key}`)}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0">{children}</main>
    </div>
  );
}
