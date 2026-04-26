'use client';

import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

const ITEMS = [
  { key: 'orders', href: '/account/orders' },
  { key: 'designs', href: '/account/designs' },
  { key: 'addresses', href: '/account/addresses' },
  { key: 'quotes', href: '/account/quotes' },
] as const;

export function AccountOverview(): JSX.Element {
  const t = useTranslations('account');
  return (
    <section className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold tracking-tight">{t('overview.heading')}</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {ITEMS.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className="group flex items-center justify-between gap-3 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary"
          >
            <div>
              <p className="text-base font-semibold">{t(`tabs.${item.key}`)}</p>
              <p className="text-sm text-muted-foreground">{t(`overview.${item.key}Hint`)}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:-scale-x-100" />
          </Link>
        ))}
      </div>
    </section>
  );
}
