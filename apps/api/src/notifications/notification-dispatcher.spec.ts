import { ConfigService } from '@nestjs/config';

import type { NotificationProvider } from '@custom-merch/shared';

import { NotificationDispatcher } from './notification-dispatcher.service';
import { NotificationLogRepository } from './notification-log.repository';

/**
 * Stand-in provider whose behaviour is configurable per-test (succeed / fail
 * / fail N times then succeed). Sequenced so we can assert the dispatcher
 * actually retries on transient failures and stops once it succeeds.
 */
function makeProvider(behaviour: ('ok' | 'fail')[]): NotificationProvider & {
  calls: number;
} {
  let calls = 0;
  const provider: NotificationProvider & { calls: number } = {
    name: 'mock',
    calls: 0,
    async send() {
      const action = behaviour[Math.min(calls, behaviour.length - 1)];
      calls += 1;
      provider.calls = calls;
      if (action === 'fail') throw new Error(`mock failure #${calls}`);
      return { id: `msg-${calls}`, acceptedAt: new Date().toISOString(), simulated: true };
    },
  };
  return provider;
}

function buildConfig(overrides: Record<string, string> = {}): ConfigService {
  return {
    get: <T = string>(key: string): T | undefined => overrides[key] as T | undefined,
  } as unknown as ConfigService;
}

describe('NotificationDispatcher', () => {
  it('records a sent log row when the provider succeeds on the first try', async () => {
    const logs = new NotificationLogRepository();
    const provider = makeProvider(['ok']);
    const dispatcher = new NotificationDispatcher(
      logs,
      provider,
      buildConfig({ NOTIFICATIONS_BACKOFF_MS: '0' }),
    );

    const result = await dispatcher.sendNow({
      to: 'user@example.com',
      templateKey: 'order.confirmation',
      locale: 'en',
      subject: 'Hi',
      orderId: '11111111-1111-1111-1111-111111111111',
    });

    expect(result.sent).toBe(true);
    const entry = logs.get(result.logId)!;
    expect(entry.status).toBe('sent');
    expect(entry.attemptCount).toBe(1);
    expect(entry.providerMessageId).toBe('msg-1');
    expect(entry.subject).toBe('Hi');
    expect(entry.provider).toBe('mock');
    expect(entry.orderId).toBe('11111111-1111-1111-1111-111111111111');
  });

  it('retries with exponential backoff and eventually succeeds', async () => {
    const logs = new NotificationLogRepository();
    const provider = makeProvider(['fail', 'fail', 'ok']);
    const dispatcher = new NotificationDispatcher(
      logs,
      provider,
      buildConfig({ NOTIFICATIONS_BACKOFF_MS: '1', NOTIFICATIONS_MAX_ATTEMPTS: '3' }),
    );

    const result = await dispatcher.sendNow({
      to: 'user@example.com',
      templateKey: 'order.confirmation',
      locale: 'en',
    });

    expect(result.sent).toBe(true);
    expect(provider.calls).toBe(3);
    const entry = logs.get(result.logId)!;
    expect(entry.status).toBe('sent');
    expect(entry.attemptCount).toBe(3);
  });

  it('marks the log as failed after exhausting retries', async () => {
    const logs = new NotificationLogRepository();
    const provider = makeProvider(['fail']);
    const dispatcher = new NotificationDispatcher(
      logs,
      provider,
      buildConfig({ NOTIFICATIONS_BACKOFF_MS: '1', NOTIFICATIONS_MAX_ATTEMPTS: '2' }),
    );

    const result = await dispatcher.sendNow({
      to: 'user@example.com',
      templateKey: 'order.confirmation',
      locale: 'en',
    });

    expect(result.sent).toBe(false);
    expect(provider.calls).toBe(2);
    const entry = logs.get(result.logId)!;
    expect(entry.status).toBe('failed');
    expect(entry.failedAt).toBeTruthy();
    expect(entry.failureReason).toContain('mock failure');
  });

  it('returns immediately from enqueue and processes asynchronously', async () => {
    const logs = new NotificationLogRepository();
    const provider = makeProvider(['ok']);
    const dispatcher = new NotificationDispatcher(
      logs,
      provider,
      buildConfig({ NOTIFICATIONS_BACKOFF_MS: '0' }),
    );

    const result = dispatcher.enqueue({
      to: 'user@example.com',
      templateKey: 'rfq.confirmation',
      locale: 'en',
      rfqId: '22222222-2222-2222-2222-222222222222',
    });

    expect(result.pending).toBe(true);
    expect(logs.get(result.logId)?.status).toBe('pending');

    // Drain the macrotask queue so the scheduled send runs.
    await new Promise((r) => setTimeout(r, 5));
    expect(logs.get(result.logId)?.status).toBe('sent');
    expect(logs.get(result.logId)?.rfqId).toBe('22222222-2222-2222-2222-222222222222');
  });

  it('list() filters by orderId / rfqId / status', async () => {
    const logs = new NotificationLogRepository();
    const provider = makeProvider(['ok']);
    const dispatcher = new NotificationDispatcher(
      logs,
      provider,
      buildConfig({ NOTIFICATIONS_BACKOFF_MS: '0' }),
    );
    await dispatcher.sendNow({
      to: 'a@example.com',
      templateKey: 'order.confirmation',
      orderId: 'order-1',
    });
    await dispatcher.sendNow({
      to: 'b@example.com',
      templateKey: 'rfq.confirmation',
      rfqId: 'rfq-1',
    });
    expect(logs.list({ orderId: 'order-1' })).toHaveLength(1);
    expect(logs.list({ rfqId: 'rfq-1' })).toHaveLength(1);
    expect(logs.list({ status: 'sent' })).toHaveLength(2);
  });
});
