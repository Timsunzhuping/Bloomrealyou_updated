import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  NotificationBatchResult,
  NotificationProvider,
  NotificationResult,
  SendBatchNotificationInput,
  SendNotificationInput,
} from '@custom-merch/shared';

import { renderTemplate, resolveTemplate } from '../templates';

/**
 * Logs each notification to stdout instead of dispatching a real message.
 * The dev / CI default — swap in a real provider via env vars without
 * touching calling code.
 *
 * When a template is registered for the requested key + locale we render it
 * locally and log the resolved subject + body so dev can verify content
 * end-to-end without a live mail provider.
 */
@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  readonly name = 'mock' as const;
  private readonly log = new Logger(MockNotificationProvider.name);

  async send(input: SendNotificationInput): Promise<NotificationResult> {
    const id = `mock_${randomUUID().slice(0, 8)}`;
    const tpl = resolveTemplate(input.templateKey, input.locale);
    if (tpl) {
      const rendered = renderTemplate(tpl, input.data ?? {});
      this.log.log(
        `[mock-notification] to=${input.to} channel=${input.channel} template=${input.templateKey} locale=${input.locale ?? 'en'} subject="${input.subject ?? rendered.subject}"`,
      );
      this.log.debug(`[mock-notification] body:\n${rendered.text}`);
    } else {
      this.log.log(
        `[mock-notification] to=${input.to} channel=${input.channel} template=${input.templateKey} locale=${input.locale ?? 'en'} data=${JSON.stringify(
          input.data ?? {},
        )}`,
      );
    }
    return { id, acceptedAt: new Date().toISOString(), simulated: true };
  }

  async sendBatch(input: SendBatchNotificationInput): Promise<NotificationBatchResult> {
    const batchId = `mock-batch_${randomUUID().slice(0, 8)}`;
    this.log.log(
      `[mock-batch] template=${input.templateKey} locale=${input.locale ?? 'en'} recipients=${input.recipients.length}`,
    );
    const results = await Promise.all(
      input.recipients.map((r) =>
        this.send({
          to: r.to,
          channel: input.channel,
          templateKey: input.templateKey,
          locale: input.locale,
          data: { ...(input.commonData ?? {}), ...(r.data ?? {}) },
          subject: r.subject ?? input.subject,
        }),
      ),
    );
    return {
      batchId,
      acceptedAt: new Date().toISOString(),
      results,
      simulated: true,
    };
  }
}
