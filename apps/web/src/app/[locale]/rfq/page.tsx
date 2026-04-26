import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Building2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { RFQForm } from '@/components/rfq/rfq-form';

import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'rfq' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

export default async function RFQPage({ params }: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('rfq');

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-3 text-center">
        <Building2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <p className="mx-auto max-w-xl text-muted-foreground">{t('subtitle')}</p>
      </header>

      <RFQForm locale={locale} />
    </div>
  );
}
