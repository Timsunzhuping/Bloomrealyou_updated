import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  NotificationProvider,
  NotificationResult,
  SendNotificationInput,
} from '@custom-merch/shared';

/**
 * Logs each notification to stdout instead of dispatching a real message.
 * The dev / CI default — swap in a real provider via env vars without
 * touching calling code.
 */
@Injectable()
export class MockNotificationProvider implements NotificationProvider {
  readonly name = 'mock' as const;
  private readonly log = new Logger(MockNotificationProvider.name);

  async send(input: SendNotificationInput): Promise<NotificationResult> {
    const id = `mock_${randomUUID().slice(0, 8)}`;
    this.log.log(
      `[mock-notification] to=${input.to} channel=${input.channel} template=${input.templateKey} locale=${input.locale ?? 'en'} data=${JSON.stringify(
        input.data ?? {},
      )}`,
    );
    return { id, acceptedAt: new Date().toISOString(), simulated: true };
  }
}
