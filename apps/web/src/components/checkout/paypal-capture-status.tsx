'use client';

import { Button, LoadingState } from '@custom-merch/ui';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

type CaptureState =
  | { status: 'idle' | 'loading' }
  | { status: 'succeeded'; orderNumber?: string }
  | { status: 'failed' };

interface PaypalCaptureStatusProps {
  paypalOrderId: string;
  orderNumber?: string;
}

export function PaypalCaptureStatus({
  paypalOrderId,
  orderNumber,
}: PaypalCaptureStatusProps): JSX.Element {
  const t = useTranslations('checkout.paypalCapture');
  const [state, setState] = React.useState<CaptureState>({ status: 'idle' });

  React.useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    getClientApi().payments.capturePaypalOrder(paypalOrderId)
      .then(() => {
        if (!cancelled) setState({ status: 'succeeded', orderNumber });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.warn('[checkout] PayPal capture failed', (err as Error).message);
        if (!cancelled) setState({ status: 'failed' });
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber, paypalOrderId]);

  if (state.status === 'loading' || state.status === 'idle') {
    return <LoadingState label={t('processing')} />;
  }

  if (state.status === 'failed') {
    return (
      <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-5">
        <AlertCircle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h2 className="text-lg font-semibold">{t('failedTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('failedBody')}</p>
        <Button asChild>
          <Link href="/checkout">{t('back')}</Link>
        </Button>
      </div>
    );
  }

  const confirmedOrderNumber = state.status === 'succeeded' ? state.orderNumber : undefined;

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-lg border bg-card p-5">
      <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
      <h2 className="text-lg font-semibold">{t('succeededTitle')}</h2>
      <p className="text-sm text-muted-foreground">{t('succeededBody')}</p>
      {confirmedOrderNumber && (
        <Button asChild>
          <Link href={`/orders/${confirmedOrderNumber}`}>{t('trackOrder')}</Link>
        </Button>
      )}
    </div>
  );
}
