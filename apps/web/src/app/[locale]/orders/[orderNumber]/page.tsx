import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { createApiClient } from '@custom-merch/sdk';
import type { OrderTrackingDto } from '@custom-merch/shared';
import { Button } from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { OrderTrackingSection } from '@/components/orders/tracking-section';
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

async function fetchTracking(orderNumber: string): Promise<OrderTrackingDto | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
  const api = createApiClient({ baseUrl, next: { revalidate: 0 } });
  try {
    return await api.tracking.byOrderNumber(orderNumber);
  } catch {
    return null;
  }
}

export default async function OrderDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, orderNumber } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const tCommon = await getTranslations({ locale, namespace: 'common' });
  const tThanks = await getTranslations({ locale, namespace: 'checkout.thanks' });

  const tracking = await fetchTracking(orderNumber);

  return (
    <section className="mx-auto max-w-3xl space-y-8 py-10">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          {tThanks('orderNumber', { number: orderNumber })}
        </h1>
        <p className="text-muted-foreground">{tThanks('body', { email: '—' })}</p>
      </header>

      {tracking && <OrderTrackingSection tracking={tracking} locale={locale} />}

      <div className="text-center">
        <Button asChild variant="outline">
          <Link href="/products">{tCommon('nav.products')}</Link>
        </Button>
      </div>
    </section>
  );
}
