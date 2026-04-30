'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import { ApiError } from '@custom-merch/sdk';
import type {
  Address,
  CartDto,
  CreatePaymentIntentResult,
  OrderDto,
} from '@custom-merch/shared';
import {
  Button,
  EmptyState,
  FormField,
  Input,
  LoadingState,
} from '@custom-merch/ui';
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

interface CheckoutPageProps {
  locale: Locale;
}

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';

let stripePromise: Promise<Stripe | null> | null = null;
function getStripePromise(): Promise<Stripe | null> | null {
  if (!STRIPE_PK) return null;
  if (!stripePromise) stripePromise = loadStripe(STRIPE_PK);
  return stripePromise;
}

interface FormState {
  customerEmail: string;
  shipping: Address;
  billingSameAsShipping: boolean;
  billing: Address;
  shippingMethod: 'standard' | 'express' | 'rush';
}

const EMPTY_ADDRESS: Address = {
  fullName: '',
  line1: '',
  city: '',
  postalCode: '',
  country: 'US',
};

export function CheckoutPage({ locale }: CheckoutPageProps): JSX.Element {
  const t = useTranslations('checkout');
  const tCart = useTranslations('cart');
  const router = useRouter();

  const [cart, setCart] = React.useState<CartDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderDto | null>(null);
  const [intent, setIntent] = React.useState<CreatePaymentIntentResult | null>(null);
  const [form, setForm] = React.useState<FormState>({
    customerEmail: '',
    shipping: { ...EMPTY_ADDRESS },
    billingSameAsShipping: true,
    billing: { ...EMPTY_ADDRESS },
    shippingMethod: 'standard',
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dto = await getClientApi().cart.get();
        if (!cancelled) setCart(dto);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[checkout] cart load failed', (err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="py-10">
        <LoadingState label={t('review.creatingOrder')} />
      </section>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <section className="py-10">
        <EmptyState
          title={t('errors.cartEmpty')}
          description={tCart('empty.body')}
          action={
            <Button asChild>
              <Link href="/products">{tCart('empty.cta')}</Link>
            </Button>
          }
        />
      </section>
    );
  }

  const onCreateOrder = async (): Promise<void> => {
    setSubmitting(true);
    setError(null);
    try {
      const api = getClientApi();
      const sessionId = api.getCartSessionId();
      if (!sessionId) {
        setError(t('errors.cartEmpty'));
        return;
      }

      const placedOrder = await api.orders.create({
        cartSessionId: sessionId,
        customerEmail: form.customerEmail,
        shippingAddress: form.shipping,
        billingAddress: form.billingSameAsShipping ? undefined : form.billing,
        shippingMethod: form.shippingMethod,
        locale,
      });
      setOrder(placedOrder);

      const created = await api.payments.createIntent({
        orderId: placedOrder.id,
        provider: 'stripe',
      });
      setIntent(created);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      // eslint-disable-next-line no-console
      console.warn('[checkout] order/intent failed', status, (err as Error).message);
      setError(t('errors.createFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  // Once we have an intent + order, render the Stripe Elements step.
  if (order && intent) {
    return (
      <PaymentStep
        order={order}
        intent={intent}
        locale={locale}
        onSimulateSuccess={async () => {
          // Mock-mode path: ship a synthetic webhook to our own API so the
          // order moves to `paid` without real Stripe.
          await getClientApi().request('/payments/webhook/stripe', {
            method: 'POST',
            body: JSON.stringify({
              id: `evt_mock_${Date.now()}`,
              type: 'payment_intent.succeeded',
              data: {
                object: {
                  id: intent.intentId,
                  amount_received: order.total.amountMinor,
                  currency: order.total.currency.toLowerCase(),
                  metadata: { orderId: order.id, orderNumber: order.orderNumber },
                },
              },
            }),
          });
          router.push(`/checkout/success?orderNumber=${order.orderNumber}`);
        }}
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          void onCreateOrder();
        }}
      >
        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">{t('contact.heading')}</h2>
          <FormField id="email" label={t('contact.email')} required>
            <Input
              type="email"
              value={form.customerEmail}
              onChange={(e) => setForm((s) => ({ ...s, customerEmail: e.target.value }))}
              required
            />
          </FormField>
        </section>

        <AddressFieldset
          legend={t('shipping.heading')}
          value={form.shipping}
          onChange={(next) => setForm((s) => ({ ...s, shipping: next }))}
          tShipping={t}
        />

        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">{t('shipping.method.heading')}</h2>
          <div className="space-y-2">
            {(['standard', 'express', 'rush'] as const).map((m) => (
              <label key={m} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="shippingMethod"
                  value={m}
                  checked={form.shippingMethod === m}
                  onChange={() => setForm((s) => ({ ...s, shippingMethod: m }))}
                />
                <span>{t(`shipping.method.${m}`)}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-base font-semibold">{t('billing.heading')}</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.billingSameAsShipping}
              onChange={(e) =>
                setForm((s) => ({ ...s, billingSameAsShipping: e.target.checked }))
              }
            />
            <span>{t('billing.sameAsShipping')}</span>
          </label>
          {!form.billingSameAsShipping && (
            <AddressFieldset
              legend={t('billing.heading')}
              value={form.billing}
              onChange={(next) => setForm((s) => ({ ...s, billing: next }))}
              tShipping={t}
            />
          )}
        </section>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={submitting}>
          {submitting ? t('review.creatingOrder') : t('review.placeOrder')}
        </Button>
      </form>

      <CartSummary cart={cart} locale={locale} />
    </div>
  );
}

function AddressFieldset({
  legend,
  value,
  onChange,
  tShipping,
}: {
  legend: string;
  value: Address;
  onChange: (next: Address) => void;
  tShipping: ReturnType<typeof useTranslations>;
}): JSX.Element {
  const update = <K extends keyof Address>(k: K, v: Address[K]): void =>
    onChange({ ...value, [k]: v });
  return (
    <fieldset className="space-y-3 rounded-lg border bg-card p-5">
      <legend className="px-2 text-base font-semibold">{legend}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField id={`${legend}-fullName`} label={tShipping('shipping.name')} required>
          <Input value={value.fullName} onChange={(e) => update('fullName', e.target.value)} required />
        </FormField>
        <FormField id={`${legend}-company`} label={tShipping('shipping.company')}>
          <Input value={value.company ?? ''} onChange={(e) => update('company', e.target.value)} />
        </FormField>
        <FormField id={`${legend}-line1`} label={tShipping('shipping.addressLine1')} required className="sm:col-span-2">
          <Input value={value.line1} onChange={(e) => update('line1', e.target.value)} required />
        </FormField>
        <FormField id={`${legend}-line2`} label={tShipping('shipping.addressLine2')} className="sm:col-span-2">
          <Input value={value.line2 ?? ''} onChange={(e) => update('line2', e.target.value)} />
        </FormField>
        <FormField id={`${legend}-city`} label={tShipping('shipping.city')} required>
          <Input value={value.city} onChange={(e) => update('city', e.target.value)} required />
        </FormField>
        <FormField id={`${legend}-state`} label={tShipping('shipping.state')}>
          <Input value={value.state ?? ''} onChange={(e) => update('state', e.target.value)} />
        </FormField>
        <FormField id={`${legend}-postal`} label={tShipping('shipping.postalCode')} required>
          <Input value={value.postalCode} onChange={(e) => update('postalCode', e.target.value)} required />
        </FormField>
        <FormField id={`${legend}-country`} label={tShipping('shipping.country')} required>
          <Input
            value={value.country}
            onChange={(e) => update('country', e.target.value.toUpperCase().slice(0, 2))}
            maxLength={2}
            required
          />
        </FormField>
        <FormField id={`${legend}-phone`} label={tShipping('shipping.phone')} className="sm:col-span-2">
          <Input value={value.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
        </FormField>
      </div>
    </fieldset>
  );
}

function CartSummary({ cart, locale }: { cart: CartDto; locale: Locale }): JSX.Element {
  const t = useTranslations('cart.summary');
  return (
    <aside className="space-y-3 self-start rounded-lg border bg-card p-5">
      <h2 className="text-base font-semibold">{t('heading')}</h2>
      <p className="text-xs text-muted-foreground">{t('itemCount', { count: cart.itemCount })}</p>
      <dl className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('subtotal')}</dt>
          <dd>{formatCurrency(cart.subtotal, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('shipping')}</dt>
          <dd>{formatCurrency(cart.shipping, locale)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">{t('tax')}</dt>
          <dd>{formatCurrency(cart.tax, locale)}</dd>
        </div>
        <div className="border-t pt-2" />
        <div className="flex justify-between text-base font-semibold">
          <dt>{t('total')}</dt>
          <dd>{formatCurrency(cart.total, locale)}</dd>
        </div>
      </dl>
    </aside>
  );
}

function PaymentStep({
  order,
  intent,
  locale,
  onSimulateSuccess,
}: {
  order: OrderDto;
  intent: CreatePaymentIntentResult;
  locale: Locale;
  onSimulateSuccess: () => Promise<void>;
}): JSX.Element {
  const t = useTranslations('checkout');
  const stripePromise = getStripePromise();

  if (!stripePromise) {
    return (
      <section className="space-y-4 rounded-lg border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">{t('payment.heading')}</h2>
        <p className="text-sm text-muted-foreground">{t('payment.stripeNotConfigured')}</p>
        <p className="text-sm">
          {formatCurrency(order.total, locale)} — order {order.orderNumber}
        </p>
        <Button onClick={() => void onSimulateSuccess()}>{t('payment.submit')}</Button>
      </section>
    );
  }

  if (!intent.clientSecret) {
    return (
      <section className="space-y-3 text-center">
        <p className="text-sm text-destructive">{t('payment.errorTitle')}</p>
      </section>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret: intent.clientSecret,
        appearance: { theme: 'stripe' },
      }}
    >
      <StripePaymentForm order={order} locale={locale} />
    </Elements>
  );
}

function StripePaymentForm({
  order,
  locale,
}: {
  order: OrderDto;
  locale: Locale;
}): JSX.Element {
  const stripe = useStripe();
  const elements = useElements();
  const t = useTranslations('checkout');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/checkout/success?orderNumber=${order.orderNumber}`,
      },
    });
    if (result.error) {
      setError(result.error.message ?? t('payment.errorBody'));
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border bg-card p-5">
      <h2 className="text-base font-semibold">{t('payment.heading')}</h2>
      <PaymentElement />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-sm text-muted-foreground">
        {formatCurrency(order.total, locale)} — {order.orderNumber}
      </p>
      <Button type="submit" disabled={!stripe || submitting} size="lg">
        {submitting ? t('payment.processing') : t('payment.submit')}
      </Button>
    </form>
  );
}
