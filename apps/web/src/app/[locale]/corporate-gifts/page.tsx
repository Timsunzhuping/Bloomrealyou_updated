import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FAQSection,
  HeroSection,
  TrustBar,
} from '@custom-merch/ui';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Gift,
  Globe,
  PartyPopper,
  Sparkles,
  Truck,
  Users,
  Zap,
} from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'rfq' });
  return {
    title: t('corporate.metaTitle'),
    description: t('corporate.metaDescription'),
  };
}

export default async function CorporateGiftsPage({ params }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('rfq');

  const scenarios = [
    { key: 'welcomeKit', icon: <Users className="h-5 w-5" /> },
    { key: 'tradeShow', icon: <Briefcase className="h-5 w-5" /> },
    { key: 'teamApparel', icon: <Sparkles className="h-5 w-5" /> },
    { key: 'clientGifts', icon: <Gift className="h-5 w-5" /> },
    { key: 'eventMerch', icon: <PartyPopper className="h-5 w-5" /> },
  ] as const;

  const bundles = ['essentials', 'fieldKit', 'premiumBox'] as const;

  const processSteps: Array<{
    icon: JSX.Element;
    label: string;
  }> = [
    { icon: <Sparkles className="h-5 w-5" />, label: t('corporate.process.steps.uploadLogo') },
    { icon: <Briefcase className="h-5 w-5" />, label: t('corporate.process.steps.getQuote') },
    { icon: <CheckCircle2 className="h-5 w-5" />, label: t('corporate.process.steps.sample') },
    { icon: <Zap className="h-5 w-5" />, label: t('corporate.process.steps.production') },
    { icon: <Truck className="h-5 w-5" />, label: t('corporate.process.steps.delivery') },
  ];

  return (
    <div className="space-y-12 pb-12">
      <HeroSection
        eyebrow={t('corporate.hero.eyebrow')}
        title={t('corporate.hero.title')}
        description={t('corporate.hero.subtitle')}
        primaryAction={
          <Button asChild size="lg">
            <Link href="/rfq">{t('corporate.hero.ctaPrimary')}</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline" size="lg">
            <Link href="/bulk-orders">{t('corporate.hero.ctaSecondary')}</Link>
          </Button>
        }
        visual={
          <div className="grid h-64 w-full place-items-center rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5">
            <Building2 className="h-12 w-12 text-accent" aria-hidden="true" />
          </div>
        }
      />

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('corporate.scenarios.heading')}
          </h2>
          <p className="text-muted-foreground">{t('corporate.scenarios.subtitle')}</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {scenarios.map((s) => (
            <Card key={s.key}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                  {s.icon}
                </span>
                <CardTitle className="text-base">
                  {t(`corporate.scenarios.items.${s.key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t(`corporate.scenarios.items.${s.key}.body`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('corporate.bundles.heading')}
          </h2>
          <p className="text-muted-foreground">{t('corporate.bundles.subtitle')}</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {bundles.map((b) => (
            <Card key={b} className="flex h-full flex-col">
              <CardHeader>
                <CardTitle>{t(`corporate.bundles.items.${b}.title`)}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <p className="text-sm text-muted-foreground">{t(`corporate.bundles.items.${b}.body`)}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {t(`corporate.bundles.items.${b}.products`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6 rounded-2xl border bg-card p-8 md:p-12">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t('corporate.process.heading')}
          </h2>
          <p className="text-muted-foreground">{t('corporate.process.subtitle')}</p>
        </header>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {processSteps.map((step, i) => (
            <li
              key={i}
              className="flex flex-col gap-2 rounded-xl border bg-background p-4"
            >
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <span className="grid h-7 w-7 place-items-center rounded-md bg-accent/10 text-accent">
                  {step.icon}
                </span>
              </div>
              <span className="text-sm font-medium">{step.label}</span>
            </li>
          ))}
        </ol>
      </section>

      <TrustBar
        items={[
          { icon: <Globe className="h-5 w-5" />, title: t('corporate.trustBar.global') },
          { icon: <Truck className="h-5 w-5" />, title: t('corporate.trustBar.speed') },
          { icon: <Sparkles className="h-5 w-5" />, title: t('corporate.trustBar.quality') },
          { icon: <Zap className="h-5 w-5" />, title: t('corporate.trustBar.support') },
        ]}
      />

      <FAQSection
        heading={t('corporate.faq.heading')}
        items={[
          { question: t('corporate.faq.items.minOrder.q'), answer: t('corporate.faq.items.minOrder.a') },
          { question: t('corporate.faq.items.leadTime.q'), answer: t('corporate.faq.items.leadTime.a') },
          { question: t('corporate.faq.items.art.q'), answer: t('corporate.faq.items.art.a') },
          { question: t('corporate.faq.items.shipping.q'), answer: t('corporate.faq.items.shipping.a') },
        ]}
      />

      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t('corporate.cta.heading')}
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          {t('corporate.cta.subtitle')}
        </p>
        <div className="mt-6">
          <Button asChild size="lg">
            <Link href="/rfq">{t('corporate.cta.button')}</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
