import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { Building2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Placeholder corporate / RFQ landing. WP-09 wires up the real RFQ flow with
 * file uploads and assignment to sales. Today, the route exists so every
 * "Request Bulk Quote" CTA across the site has a home.
 */
export default async function BusinessPlaceholder({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const tRfq = await getTranslations({ locale, namespace: 'rfq' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <section className="space-y-6 py-12 text-center">
      <Building2 className="mx-auto h-12 w-12 text-primary" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">{tRfq('title')}</h1>
      <p className="mx-auto max-w-xl text-muted-foreground">{tRfq('subtitle')}</p>
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href="/products">{tCommon('nav.products')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{tCommon('nav.home')}</Link>
        </Button>
      </div>
    </section>
  );
}
