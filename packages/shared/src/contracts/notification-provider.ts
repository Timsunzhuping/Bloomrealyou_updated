import type { Locale } from '../constants/locales';
import type { NotificationChannel } from '../types/notification';

/**
 * Notification (email / SMS / in-app / webhook) sender contract.
 *
 * The platform's MVP uses {@link MockNotificationProvider} which logs each
 * message to stdout. Real providers (SendGrid, AWS SES, Postmark) plug in
 * the same way the AI / Storage / Payment provider abstractions do, so we
 * never change calling code when swapping out the carrier.
 *
 * The {@link NotificationChannel} union is re-used from the entity types so
 * the persisted `notification_log.channel` column and the in-flight payload
 * stay in lockstep.
 */
export interface NotificationProvider {
  readonly name: NotificationProviderName;
  send(input: SendNotificationInput): Promise<NotificationResult>;
  /**
   * Optional batch sender. Implementations that don't override this fall back
   * to N parallel `send()` calls — handy for MVP / mock providers but real
   * providers (SendGrid, SES) override to use their bulk endpoints which are
   * an order of magnitude cheaper for shipment-batch notifications.
   */
  sendBatch?(input: SendBatchNotificationInput): Promise<NotificationBatchResult>;
}

export type NotificationProviderName = 'mock' | 'sendgrid' | 'ses' | 'postmark';

export interface SendNotificationInput {
  /** Channel-specific recipient (e.g. email address, phone number, push token). */
  to: string;
  channel: NotificationChannel;
  /** Stable template key — the provider resolves it to a real message body. */
  templateKey: string;
  /** Locale for the template lookup. Defaults to en when omitted. */
  locale?: Locale;
  /** Template variables. Mock provider just JSON-stringifies the payload. */
  data?: Record<string, unknown>;
  /** Optional subject override (channel-specific). */
  subject?: string;
}

export interface NotificationResult {
  /** Provider-specific message id (or a synthetic one for the mock). */
  id: string;
  acceptedAt: string;
  /** When the provider performs no real send (mock / disabled), this is true. */
  simulated: boolean;
}

export interface SendBatchNotificationInput {
  /** Per-recipient overrides. Each entry produces one message. */
  recipients: Array<{
    to: string;
    /** Recipient-specific template variables, merged on top of `commonData`. */
    data?: Record<string, unknown>;
    /** Per-recipient subject (rare; defaults to the batch subject). */
    subject?: string;
  }>;
  channel: NotificationChannel;
  templateKey: string;
  locale?: Locale;
  /** Variables shared by every recipient (e.g. campaign name). */
  commonData?: Record<string, unknown>;
  /** Default subject for every recipient. Per-recipient subjects override it. */
  subject?: string;
}

export interface NotificationBatchResult {
  /** Provider-side batch id, when available. Synthetic ids are common for
   *  per-message senders that we sequenced ourselves. */
  batchId: string;
  acceptedAt: string;
  /** Per-recipient outcomes, in input order. Failed entries carry an error. */
  results: Array<NotificationResult | { error: string; to: string }>;
  /** True when no real network call was made (mock / disabled). */
  simulated: boolean;
}
