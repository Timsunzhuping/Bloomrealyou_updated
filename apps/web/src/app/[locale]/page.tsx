import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { PRODUCT_CATEGORIES, type ProductCategory } from '@custom-merch/shared';
import {
  Button,
  CategoryCard,
  CategoryGrid,
  CorporateCTA,
  FAQSection,
  HeroSection,
  TemplateGrid,
  TrustBar,
} from '@custom-merch/ui';
import { Bot, Building2, Globe, Sparkles, Truck, Zap } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>',
  );

const CATEGORY_HREFS: Record<ProductCategory, string> = {
  't-shirts': '/custom-t-shirts',
  hoodies: '/custom-hoodies',
  mugs: '/custom-mugs',
  hats: '/custom-hats',
  'tote-bags': '/custom-tote-bags',
  stickers: '/custom-stickers',
};

export async function generateMetadata(props: HomePageProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'home' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function HomePage({ params }: HomePageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('home');
  const tProducts = await getTranslations('products');

  return (
    <div className="space-y-12 pb-12">
      <HeroSection
        eyebrow={t('hero.eyebrow')}
        title={t('hero.title')}
        description={t('hero.subtitle')}
        primaryAction={
          <Button asChild size="lg">
            <Link href="/products">{t('hero.ctaPrimary')}</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline" size="lg">
            <Link href="/customize/classic-cotton-tee">{t('hero.ctaSecondary')}</Link>
          </Button>
        }
        visual={
          <div className="grid h-64 w-full place-items-center rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5">
            <Sparkles className="h-12 w-12 text-accent" aria-hidden="true" />
          </div>
        }
      />

      {/* Three primary CTAs */}
      <section className="grid gap-4 sm:grid-cols-3">
        <PrimaryCtaCard
          icon={<Sparkles className="h-5 w-5" />}
          label={t('primaryCtas.startDesigning')}
          href="/customize/classic-cotton-tee"
        />
        <PrimaryCtaCard
          icon={<Bot className="h-5 w-5" />}
          label={t('primaryCtas.uploadLogo')}
          href="/customize/classic-cotton-tee?step=upload"
        />
        <PrimaryCtaCard
          icon={<Building2 className="h-5 w-5" />}
          label={t('primaryCtas.requestBulkQuote')}
          href="/business"
        />
      </section>

      {/* Categories */}
      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('categories.heading')}</h2>
          <p className="text-muted-foreground">{t('categories.subtitle')}</p>
        </header>
        <CategoryGrid>
          {PRODUCT_CATEGORIES.map((cat) => (
            <Link key={cat} href={CATEGORY_HREFS[cat]}>
              <CategoryCard
                title={tProducts(`categories.${cat}.name`)}
                subtitle={tProducts(`categories.${cat}.tagline`)}
                imageSrc={PLACEHOLDER_IMG}
                imageAlt={tProducts(`categories.${cat}.name`)}
              />
            </Link>
          ))}
        </CategoryGrid>
      </section>

      {/* Trust bar */}
      <TrustBar
        items={[
          { icon: <Globe className="h-5 w-5" />, title: t('trustBar.global') },
          { icon: <Truck className="h-5 w-5" />, title: t('trustBar.speed') },
          { icon: <Bot className="h-5 w-5" />, title: t('trustBar.quality') },
          { icon: <Zap className="h-5 w-5" />, title: t('trustBar.support') },
        ]}
      />

      {/* AI Assistant placeholder */}
      <section className="grid gap-4 rounded-2xl border bg-gradient-to-br from-accent/10 to-primary/5 p-8 md:grid-cols-[2fr_1fr] md:items-center md:gap-8 md:p-12">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">AI</p>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('ai.heading')}</h2>
          <p className="max-w-xl text-muted-foreground">{t('ai.subtitle')}</p>
          <Button asChild className="mt-2">
            <Link href="/customize/classic-cotton-tee?ai=1">{t('ai.cta')}</Link>
          </Button>
        </div>
        <div className="grid h-48 place-items-center rounded-xl bg-background/60">
          <Sparkles className="h-12 w-12 text-accent" aria-hidden="true" />
        </div>
      </section>

      {/* Corporate CTA */}
      <CorporateCTA
        eyebrow={t('corporate.heading')}
        title={t('corporate.heading')}
        description={t('corporate.subtitle')}
        bullets={[
          { icon: <Building2 className="h-4 w-4" />, label: t('trustBar.global') },
          { icon: <Sparkles className="h-4 w-4" />, label: t('trustBar.speed') },
          { icon: <Truck className="h-4 w-4" />, label: t('trustBar.quality') },
          { icon: <Zap className="h-4 w-4" />, label: t('trustBar.support') },
        ]}
        primaryAction={
          <Button asChild>
            <Link href="/business">{t('corporate.ctaPrimary')}</Link>
          </Button>
        }
        secondaryAction={
          <Button
            asChild
            variant="outline"
            className="border-background/30 bg-transparent text-background hover:bg-background/10 hover:text-background"
          >
            <Link href="/business?intent=quote">{t('corporate.ctaSecondary')}</Link>
          </Button>
        }
      />

      {/* Trending templates */}
      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('templates.heading')}</h2>
          <p className="text-muted-foreground">{t('templates.subtitle')}</p>
        </header>
        <TemplateGrid
          items={[
            { id: 'tech', title: t('templates.items.techConference'), imageSrc: PLACEHOLDER_IMG },
            { id: 'birthday', title: t('templates.items.birthdayGift'), imageSrc: PLACEHOLDER_IMG },
            { id: 'team', title: t('templates.items.teamShirt'), imageSrc: PLACEHOLDER_IMG },
            { id: 'holiday', title: t('templates.items.holidayGift'), imageSrc: PLACEHOLDER_IMG },
            { id: 'corporate', title: t('templates.items.corporateEvent'), imageSrc: PLACEHOLDER_IMG },
          ]}
        />
      </section>

      {/* FAQ */}
      <FAQSection
        heading={t('faq.heading')}
        items={[
          { question: t('faq.items.q1'), answer: t('faq.items.a1') },
          { question: t('faq.items.q2'), answer: t('faq.items.a2') },
          { question: t('faq.items.q3'), answer: t('faq.items.a3') },
        ]}
      />
    </div>
  );
}

function PrimaryCtaCard({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}): JSX.Element {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-5 shadow-sm transition-colors hover:border-primary"
    >
      <span className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
          {icon}
        </span>
        <span className="text-sm font-semibold">{label}</span>
      </span>
      <span aria-hidden="true" className="text-muted-foreground rtl:rotate-180">
        →
      </span>
    </Link>
  );
}
