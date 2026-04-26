import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { XCircle } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'checkout.cancelled' });
  return { title: t('title') };
}

export default async function CheckoutCancelledPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'checkout.cancelled' });

  return (
    <section className="space-y-6 py-12 text-center">
      <XCircle className="mx-auto h-12 w-12 text-destructive" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <Button asChild>
        <Link href="/checkout">{t('back')}</Link>
      </Button>
    </section>
  );
}
