import type { AdminDashboardSnapshot } from '@custom-merch/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@custom-merch/ui';
import {
  AlertTriangle,
  ClipboardList,
  Coins,
  Factory,
  FileText,
  Hammer,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { getAdminApi } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string }>;
}

function fmtMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export default async function DashboardPage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let snapshot: AdminDashboardSnapshot | null = null;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    snapshot = await api.adminDashboard.get();
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.heading')}</h1>
          <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        {snapshot && (
          <p className="text-xs text-muted-foreground">
            {t('dashboard.lastUpdated', {
              time: new Date(snapshot.generatedAt).toLocaleString(locale),
            })}
          </p>
        )}
      </header>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {t('dashboard.loadError')} ({fetchError})
        </p>
      )}

      {snapshot && (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi
            label={t('dashboard.kpi.ordersToday')}
            value={snapshot.ordersToday.toString()}
            icon={<ShoppingBag className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.gmvToday')}
            value={fmtMoney(snapshot.gmvToday.amountMinor, snapshot.gmvToday.currency)}
            icon={<Coins className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.designsPendingReview')}
            value={snapshot.designsPendingReview.toString()}
            icon={<ClipboardList className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.ordersPendingProduction')}
            value={snapshot.ordersPendingProduction.toString()}
            icon={<Hammer className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.ordersInProduction')}
            value={snapshot.ordersInProduction.toString()}
            icon={<Factory className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.ordersPendingShipment')}
            value={snapshot.ordersPendingShipment.toString()}
            icon={<Truck className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.ordersExceptions')}
            value={snapshot.ordersExceptions.toString()}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <Kpi
            label={t('dashboard.kpi.rfqsOpen')}
            value={snapshot.rfqsOpen.toString()}
            icon={<FileText className="h-5 w-5" />}
          />
        </section>
      )}

      <section className="grid gap-3 lg:grid-cols-2">
        <ChartPlaceholder
          title={t('dashboard.charts.ordersTrend')}
          subtitle={t('dashboard.charts.ordersTrendPlaceholder')}
        />
        <ChartPlaceholder
          title={t('dashboard.charts.fulfilmentMix')}
          subtitle={t('dashboard.charts.fulfilmentMixPlaceholder')}
        />
      </section>
    </section>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}): JSX.Element {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
        <span className="grid h-8 w-8 place-items-center rounded-md bg-accent/10 text-accent">
          {icon}
        </span>
      </CardHeader>
      <CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent>
    </Card>
  );
}

function ChartPlaceholder({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-48 flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
        <svg
          width="200"
          height="80"
          viewBox="0 0 200 80"
          role="img"
          aria-label={title}
          className="text-muted-foreground/40"
        >
          <polyline
            points="0,60 25,55 50,40 75,45 100,30 125,25 150,35 175,18 200,22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
        </svg>
        <p>{subtitle}</p>
      </CardContent>
    </Card>
  );
}
