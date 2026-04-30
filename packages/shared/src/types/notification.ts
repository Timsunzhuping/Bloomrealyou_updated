import type { Locale } from '../constants/locales';
import type { NotificationStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Timestamps } from './common';
import type { UserId } from './user';

export type NotificationLogId = Brand<string, 'NotificationLogId'>;

/** Channel through which a notification is delivered. */
export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'webhook';

/**
 * Stable identifier for a templated message. Concrete templates and locales
 * live in the EmailProvider adapter; this string is the join key.
 */
export type NotificationTemplateKey =
  | 'order.created'
  | 'order.paid'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  | 'design.approved'
  | 'design.rejected'
  | 'rfq.received'
  | 'quote.sent'
  | 'production.failed'
  | 'auth.password_reset'
  | (string & { readonly __branded?: 'NotificationTemplateKey' });

/** Persistent record of every outbound notification, used for audit & retries. */
export interface NotificationLog extends Timestamps {
  id: NotificationLogId;
  /** Recipient user, when known. */
  recipientUserId?: UserId | null;
  /** Recipient address (email / phone / webhook URL). */
  recipientAddress: string;
  channel: NotificationChannel;
  templateKey: NotificationTemplateKey;
  locale: Locale;
  /** Variables interpolated into the template at send time. */
  variables?: Record<string, unknown>;
  status: NotificationStatus;
  /** Provider message id (e.g. SES MessageId, Twilio SID). */
  providerMessageId?: string;
  /** Number of delivery attempts so far. */
  attemptCount: number;
  sentAt?: IsoDateString | null;
  deliveredAt?: IsoDateString | null;
  failedAt?: IsoDateString | null;
  failureReason?: string | null;
}
