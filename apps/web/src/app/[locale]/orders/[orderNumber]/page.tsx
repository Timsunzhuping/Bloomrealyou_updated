import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string; orderNumber: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, orderNumber } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  return { title: `Order ${orderNumber}` };
}

/**
 * Placeholder order detail page. Tracking + status timeline land in WP-10
 * (admin / customer dashboards). Today the route exists so checkout
 * success pages can deep-link the customer to their order.
 */
export default async function OrderDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, orderNumber } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tThanks = await getTranslations({ locale, namespace: 'checkout.thanks' });

  return (
    <section className="space-y-6 py-10 text-center">
      <h1 className="text-3xl font-bold tracking-tight">
        {tThanks('orderNumber', { number: orderNumber })}
      </h1>
      <p className="text-muted-foreground">{tThanks('body', { email: '—' })}</p>
      <Button asChild variant="outline">
        <Link href="/products">{tCommon('nav.products')}</Link>
      </Button>
    </section>
  );
}
