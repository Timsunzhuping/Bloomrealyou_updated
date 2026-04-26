import { Button } from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tNav = await getTranslations('common.nav');

  return (
    <section className="space-y-10">
      <header className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">{t('hero.title')}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{t('hero.subtitle')}</p>
        <div className="flex flex-wrap gap-3">
          <Button>{t('hero.ctaPrimary')}</Button>
          <Button variant="outline">{t('hero.ctaSecondary')}</Button>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-2xl font-semibold">{t('categories.heading')}</h2>
        <p className="text-muted-foreground">{t('categories.subtitle')}</p>
        <p className="text-sm text-muted-foreground">{tNav('products')}</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <FeatureCard title={t('features.ai.title')} body={t('features.ai.body')} />
        <FeatureCard title={t('features.pricing.title')} body={t('features.pricing.body')} />
        <FeatureCard title={t('features.fulfilment.title')} body={t('features.fulfilment.body')} />
      </section>
    </section>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <article className="rounded-lg border bg-card p-5">
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </article>
  );
}
