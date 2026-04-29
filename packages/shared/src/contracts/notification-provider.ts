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
