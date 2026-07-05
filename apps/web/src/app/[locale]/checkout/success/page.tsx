import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { CheckCircle2 } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaypalCaptureStatus } from '@/components/checkout/paypal-capture-status';
import { Link } from '@/i18n/navigation';

import type { Metadata } from 'next';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ orderNumber?: string; token?: string }>;
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'checkout.thanks' });
  return { title: t('title') };
}

export default async function CheckoutSuccessPage(props: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await props.params;
  const { orderNumber, token } = await props.searchParams;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'checkout.thanks' });

  return (
    <section className="space-y-6 py-12 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-success" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body', { email: 'you@example.com' })}</p>
      {orderNumber && (
        <p className="text-sm font-medium">{t('orderNumber', { number: orderNumber })}</p>
      )}
      {token && <PaypalCaptureStatus paypalOrderId={token} orderNumber={orderNumber} />}
      <div className="flex justify-center gap-3">
        {orderNumber && (
          <Button asChild>
            <Link href={`/orders/${orderNumber}`}>{t('trackOrder')}</Link>
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/products">{t('continueShopping')}</Link>
        </Button>
      </div>
    </section>
  );
}
