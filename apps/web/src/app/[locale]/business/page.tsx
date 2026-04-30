import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { Building2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { GiftSetSuggestionForm } from '@/components/business/gift-set-form';
import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * Corporate / RFQ landing. Includes the AI gift-set suggester so prospects
 * get an instant kit recommendation before filling the full RFQ form.
 */
export default async function BusinessPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const tRfq = await getTranslations({ locale, namespace: 'rfq' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <div className="space-y-12 py-8">
      <section className="space-y-4 text-center">
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

      <GiftSetSuggestionForm locale={locale} />
    </div>
  );
}
