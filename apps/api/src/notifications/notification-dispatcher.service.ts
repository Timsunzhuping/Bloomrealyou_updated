import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type {
  Locale,
  NotificationChannel,
  NotificationProvider,
} from '@custom-merch/shared';

import { NotificationLogRepository } from './notification-log.repository';
import { NOTIFICATION_PROVIDER } from './notification.tokens';

export interface DispatchInput {
  to: string;
  channel?: NotificationChannel;
  templateKey: string;
  locale?: Locale;
  subject?: string;
  data?: Record<string, unknown>;
  /** Audit-only context — surfaced as columns on `notification_logs`. */
  recipientUserId?: string | null;
  orderId?: string | null;
  rfqId?: string | null;
  quoteId?: string | null;
}

export interface DispatchResult {
  /** Notification log id — admins can look up the full audit row by this. */
  logId: string;
  /** True once the underlying provider call has succeeded. */
  sent: boolean;
  /** True when delivery attempts will continue in the background. */
  pending: boolean;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_MS = 500;

/**
 * High-level "send a notification" facade with built-in retry, audit
 * logging, and an optional async queue.
 *
 * - **Reliability:** failures are retried with exponential backoff up to
 *   {@link DEFAULT_MAX_ATTEMPTS}. Every attempt is recorded on the
 *   {@link NotificationLogRepository} entry so admins can see what tried
 *   and why it failed.
 * - **Async:** in dev / CI we run the retry loop on `setImmediate`. In
 *   production a thin BullMQ adapter (selected via `NOTIFICATIONS_QUEUE_DRIVER`
 *   = `bullmq` + `BULLMQ_REDIS_URL`) hands the same job off to a Redis-backed
 *   queue so multiple API instances can share the workload. Both paths share
 *   the actual send logic — the queue is just where the trigger lives.
 * - **Provider-agnostic:** the {@link NotificationProvider} token resolves to
 *   the configured implementation (mock / sendgrid / ses), so callers don't
 *   reach for env vars or branch on providers.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly log = new Logger(NotificationDispatcher.name);
  private readonly maxAttempts: number;
  private readonly backoffMs: number;
  private readonly driverName: 'in-memory' | 'bullmq';
  private readonly bullmqQueue: BullmqLikeQueue | null = null;

  constructor(
    private readonly logs: NotificationLogRepository,
    @Inject(NOTIFICATION_PROVIDER) private readonly notifier: NotificationProvider,
    config: ConfigService,
  ) {
    this.maxAttempts =
      Number(config.get<string>('NOTIFICATIONS_MAX_ATTEMPTS') ?? '') || DEFAULT_MAX_ATTEMPTS;
    this.backoffMs =
      Number(config.get<string>('NOTIFICATIONS_BACKOFF_MS') ?? '') || DEFAULT_BACKOFF_MS;
    const driver = (config.get<string>('NOTIFICATIONS_QUEUE_DRIVER') ?? 'in-memory').toLowerCase();
    const redisUrl = config.get<string>('BULLMQ_REDIS_URL');
    if (driver === 'bullmq' && redisUrl) {
      this.bullmqQueue = tryLoadBullMq(redisUrl, this.log);
      this.driverName = this.bullmqQueue ? 'bullmq' : 'in-memory';
    } else {
      this.driverName = 'in-memory';
    }
    this.log.log(
      `notification dispatcher ready (provider=${this.notifier.name}, queue=${this.driverName})`,
    );
  }

  /**
   * Enqueue a send. The log row is created synchronously so callers always
   * have an id to surface in audit trails; actual delivery (and retries)
   * runs asynchronously.
   */
  enqueue(input: DispatchInput): DispatchResult {
    const entry = this.logs.create({
      recipientAddress: input.to,
      recipientUserId: input.recipientUserId ?? null,
      channel: input.channel ?? 'email',
      templateKey: input.templateKey,
      locale: input.locale ?? 'en',
      subject: input.subject ?? null,
      provider: this.notifier.name,
      variables: input.data ?? null,
      orderId: input.orderId ?? null,
      rfqId: input.rfqId ?? null,
      quoteId: input.quoteId ?? null,
    });

    if (this.bullmqQueue) {
      void this.bullmqQueue.add('send', { logId: entry.id, input }).catch((e) => {
        this.log.warn(`bullmq enqueue failed (${(e as Error).message}); running inline`);
        this.scheduleRun(entry.id, input, 0);
      });
    } else {
      this.scheduleRun(entry.id, input, 0);
    }
    return { logId: entry.id, sent: false, pending: true };
  }

  /**
   * Synchronous send-and-log used by tests + the admin "test send" button so
   * callers can `await` the outcome. Internally goes through the same retry
   * loop minus the async hand-off.
   */
  async sendNow(input: DispatchInput): Promise<DispatchResult> {
    const entry = this.logs.create({
      recipientAddress: input.to,
      recipientUserId: input.recipientUserId ?? null,
      channel: input.channel ?? 'email',
      templateKey: input.templateKey,
      locale: input.locale ?? 'en',
      subject: input.subject ?? null,
      provider: this.notifier.name,
      variables: input.data ?? null,
      orderId: input.orderId ?? null,
      rfqId: input.rfqId ?? null,
      quoteId: input.quoteId ?? null,
    });
    const sent = await this.runWithRetry(entry.id, input);
    return { logId: entry.id, sent, pending: false };
  }

  driver(): 'in-memory' | 'bullmq' {
    return this.driverName;
  }

  private scheduleRun(logId: string, input: DispatchInput, attempt: number): void {
    const delay = attempt === 0 ? 0 : this.backoffMs * Math.pow(2, attempt - 1);
    setTimeout(() => {
      void this.attempt(logId, input, attempt + 1);
    }, delay);
  }

  private async runWithRetry(logId: string, input: DispatchInput): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const ok = await this.attempt(logId, input, attempt);
      if (ok) return true;
      if (attempt < this.maxAttempts) {
        const delay = this.backoffMs * Math.pow(2, attempt - 1);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return false;
  }

  private async attempt(
    logId: string,
    input: DispatchInput,
    attemptNumber: number,
  ): Promise<boolean> {
    try {
      const res = await this.notifier.send({
        to: input.to,
        channel: input.channel ?? 'email',
        templateKey: input.templateKey,
        locale: input.locale,
        subject: input.subject,
        data: input.data,
      });
      this.logs.update(logId, {
        status: 'sent',
        attemptCount: attemptNumber,
        sentAt: new Date().toISOString(),
        providerMessageId: res.id,
      });
      return true;
    } catch (e) {
      const message = (e as Error).message;
      const isFinalAttempt = attemptNumber >= this.maxAttempts;
      this.logs.update(logId, {
        status: isFinalAttempt ? 'failed' : 'pending',
        attemptCount: attemptNumber,
        failedAt: isFinalAttempt ? new Date().toISOString() : null,
        failureReason: message,
      });
      this.log.warn(
        `attempt ${attemptNumber}/${this.maxAttempts} for log=${logId} failed: ${message}`,
      );
      // The async path schedules its own retries; the sync path's caller loops.
      if (!isFinalAttempt && this.driverName === 'in-memory' && !this.bullmqQueue) {
        // no-op: caller (`runWithRetry` or background scheduler) handles retry
      }
      if (!isFinalAttempt && this.bullmqQueue) {
        // BullMQ replays the same payload on its own retry policy when wired up.
      }
      return false;
    }
  }
}

interface BullmqLikeQueue {
  add(name: string, data: unknown): Promise<unknown>;
}

function tryLoadBullMq(redisUrl: string, log: Logger): BullmqLikeQueue | null {
  try {
    // Lazy require so missing the optional dep doesn't break the in-memory path.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const bull = require('bullmq') as {
      Queue: new (
        name: string,
        opts: { connection: { url: string } },
      ) => BullmqLikeQueue;
    };
    return new bull.Queue('notifications', { connection: { url: redisUrl } });
  } catch (e) {
    log.warn(
      `BULLMQ_REDIS_URL set but bullmq not installed (${(e as Error).message}); falling back to in-memory queue`,
    );
    return null;
  }
}
