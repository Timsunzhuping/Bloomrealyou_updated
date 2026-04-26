import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button, Card, CardContent } from '@custom-merch/ui';
import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ n?: string }>;
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'rfq' });
  return { title: t('success.title') };
}

export default async function RFQSuccessPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const { n } = await searchParams;
  const t = await getTranslations('rfq');

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12 text-center">
      <CheckCircle2 className="mx-auto h-16 w-16 text-primary" aria-hidden="true" />
      <header className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('success.title')}</h1>
        <p className="text-muted-foreground">{t('success.subtitle')}</p>
        {n && (
          <p className="text-sm font-medium">
            {t('submitted.rfqNumber', { number: n })}
          </p>
        )}
      </header>

      <Card>
        <CardContent className="space-y-3 p-6 text-start text-sm">
          <p className="font-semibold">{t('submitted.next')}</p>
          <ol className="list-decimal space-y-2 ps-5 text-muted-foreground">
            <li>{t('submitted.step1')}</li>
            <li>{t('submitted.step2')}</li>
            <li>{t('submitted.step3')}</li>
          </ol>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">{t('success.ctaHome')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/corporate-gifts">{t('success.ctaCorporate')}</Link>
        </Button>
      </div>
    </div>
  );
}
