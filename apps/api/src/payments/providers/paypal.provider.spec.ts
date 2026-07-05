import { PaypalProvider } from './paypal.provider';

describe('PaypalProvider', () => {
  it('falls back to a mock redirect when credentials are missing', async () => {
    const provider = new PaypalProvider();

    const intent = await provider.createIntent({
      orderId: 'order_123',
      orderNumber: 'ORD-123',
      amount: { amountMinor: 2599, currency: 'USD' },
      customerEmail: 'buyer@example.com',
    });

    expect(intent.provider).toBe('paypal');
    expect(intent.intentId).toMatch(/^paypal_mock_/);
    expect(intent.redirectUrl).toContain(intent.intentId);
  });

  it('maps completed capture webhooks back to the PayPal order id and platform order id', async () => {
    const provider = new PaypalProvider();

    const event = await provider.parseWebhook({
      rawBody: JSON.stringify({
        id: 'WH-123',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'capture_123',
          custom_id: 'order:order_123',
          amount: { value: '25.99', currency_code: 'USD' },
          supplementary_data: {
            related_ids: { order_id: 'paypal_order_123' },
          },
        },
      }),
    });

    expect(event).toMatchObject({
      id: 'WH-123',
      kind: 'payment_succeeded',
      intentId: 'paypal_order_123',
      orderId: 'order_123',
      amount: { amountMinor: 2599, currency: 'USD' },
    });
  });

  it('captures an approved PayPal order and maps it to a succeeded payment event', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'PAYPAL-ORDER-123',
          status: 'COMPLETED',
          purchase_units: [
            {
              reference_id: 'order_123',
              custom_id: 'order:order_123',
              payments: {
                captures: [
                  {
                    id: 'CAPTURE-123',
                    status: 'COMPLETED',
                    amount: { value: '25.99', currency_code: 'USD' },
                  },
                ],
              },
            },
          ],
        }),
      });
    global.fetch = fetchMock as unknown as typeof fetch;

    try {
      const provider = new PaypalProvider({
        clientId: 'client-id',
        clientSecret: 'client-secret',
        environment: 'sandbox',
      });

      const event = await provider.captureIntent({ intentId: 'PAYPAL-ORDER-123' });

      expect(event).toMatchObject({
        id: 'paypal_capture_CAPTURE-123',
        kind: 'payment_succeeded',
        intentId: 'PAYPAL-ORDER-123',
        orderId: 'order_123',
        amount: { amountMinor: 2599, currency: 'USD' },
      });
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://api-m.sandbox.paypal.com/v2/checkout/orders/PAYPAL-ORDER-123/capture',
        expect.objectContaining({ method: 'POST' }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
