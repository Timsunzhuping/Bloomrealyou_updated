import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FAQSection,
  HeroSection,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { Boxes, CheckCircle2, Globe, ImageIcon, Package, Truck, Users } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const TIER_ROWS: Array<{
  key: 't50' | 't100' | 't250' | 't500' | 't1000';
  tee: string;
  hoodie: string;
  mug: string;
  tote: string;
  sticker: string;
}> = [
  { key: 't50', tee: '$12.90', hoodie: '$28.50', mug: '$8.90', tote: '$9.50', sticker: '$1.90' },
  { key: 't100', tee: '$11.40', hoodie: '$26.40', mug: '$7.90', tote: '$8.50', sticker: '$1.50' },
  { key: 't250', tee: '$9.90', hoodie: '$24.20', mug: '$6.90', tote: '$7.20', sticker: '$1.10' },
  { key: 't500', tee: '$8.40', hoodie: '$21.90', mug: '$5.90', tote: '$6.20', sticker: '$0.90' },
  { key: 't1000', tee: '$7.20', hoodie: '$19.90', mug: '$5.10', tote: '$5.40', sticker: '$0.70' },
];

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'rfq' });
  return {
    title: t('bulk.metaTitle'),
    description: t('bulk.metaDescription'),
  };
}

export default async function BulkOrdersPage({ params }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('rfq');

  const highlights = [
    { key: 'sampling', icon: <CheckCircle2 className="h-5 w-5" /> },
    { key: 'art', icon: <ImageIcon className="h-5 w-5" /> },
    { key: 'manager', icon: <Users className="h-5 w-5" /> },
    { key: 'delivery', icon: <Globe className="h-5 w-5" /> },
  ] as const;

  return (
    <div className="space-y-12 pb-12">
      <HeroSection
        eyebrow={t('bulk.hero.eyebrow')}
        title={t('bulk.hero.title')}
        description={t('bulk.hero.subtitle')}
        primaryAction={
          <Button asChild size="lg">
            <Link href="/rfq?intent=bulk">{t('bulk.hero.ctaPrimary')}</Link>
          </Button>
        }
        secondaryAction={
          <Button asChild variant="outline" size="lg">
            <Link href="#tiers">{t('bulk.hero.ctaSecondary')}</Link>
          </Button>
        }
        visual={
          <div className="grid h-64 w-full place-items-center rounded-2xl bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5">
            <Boxes className="h-12 w-12 text-accent" aria-hidden="true" />
          </div>
        }
      />

      <section id="tiers" className="space-y-4">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('bulk.tiers.heading')}</h2>
          <p className="text-muted-foreground">{t('bulk.tiers.subtitle')}</p>
        </header>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('bulk.tiers.columns.tier')}</TableHead>
                <TableHead>{t('bulk.tiers.columns.tee')}</TableHead>
                <TableHead>{t('bulk.tiers.columns.hoodie')}</TableHead>
                <TableHead>{t('bulk.tiers.columns.mug')}</TableHead>
                <TableHead>{t('bulk.tiers.columns.tote')}</TableHead>
                <TableHead>{t('bulk.tiers.columns.sticker')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TIER_ROWS.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">{t(`bulk.tiers.rows.${row.key}`)}</TableCell>
                  <TableCell>{row.tee}</TableCell>
                  <TableCell>{row.hoodie}</TableCell>
                  <TableCell>{row.mug}</TableCell>
                  <TableCell>{row.tote}</TableCell>
                  <TableCell>{row.sticker}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('bulk.highlights.heading')}</h2>
        </header>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((h) => (
            <Card key={h.key}>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
                  {h.icon}
                </span>
                <CardTitle className="text-base">
                  {t(`bulk.highlights.items.${h.key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {t(`bulk.highlights.items.${h.key}.body`)}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <FAQSection
        heading={t('bulk.faq.heading')}
        items={[
          { question: t('bulk.faq.items.minimum.q'), answer: t('bulk.faq.items.minimum.a') },
          { question: t('bulk.faq.items.mix.q'), answer: t('bulk.faq.items.mix.a') },
          { question: t('bulk.faq.items.split.q'), answer: t('bulk.faq.items.split.a') },
        ]}
      />

      <section className="rounded-2xl border bg-gradient-to-br from-primary/10 via-accent/20 to-primary/5 p-8 text-center md:p-12">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('bulk.cta.heading')}</h2>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">{t('bulk.cta.subtitle')}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/rfq?intent=bulk">{t('bulk.cta.button')}</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/products">
              <Package className="me-2 h-4 w-4" aria-hidden="true" />
              <Truck className="me-2 h-4 w-4" aria-hidden="true" />
              {t('bulk.hero.ctaSecondary')}
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
