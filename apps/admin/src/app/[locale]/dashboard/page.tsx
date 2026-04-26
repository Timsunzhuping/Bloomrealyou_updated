import { Button } from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('admin.dashboard');
  const tNav = await getTranslations('admin.nav');

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('heading')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <KpiCard label={t('kpi.ordersToday')} value="—" />
        <KpiCard label={t('kpi.revenueToday')} value="—" />
        <KpiCard label={t('kpi.openRfqs')} value="—" />
        <KpiCard label={t('kpi.productionJobsInFlight')} value="—" />
      </section>

      <section className="flex gap-3">
        <Button variant="secondary">{tNav('orders')}</Button>
        <Button variant="outline">{tNav('settings')}</Button>
      </section>
    </section>
  );
}

function KpiCard({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <article className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  );
}
