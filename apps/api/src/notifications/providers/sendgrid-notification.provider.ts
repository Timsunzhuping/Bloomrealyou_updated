import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type {
  NotificationProvider,
  NotificationResult,
  SendNotificationInput,
} from '@custom-merch/shared';

/**
 * SendGrid v3 transactional email adapter.
 *
 * The platform stores templates as keys; this adapter expects each `templateKey`
 * to map to a SendGrid `template_id`. Configure the mapping in
 * `SENDGRID_TEMPLATES` as a JSON blob (`{"order.qc_passed":"d-abc123",...}`)
 * and the adapter sends the corresponding template with `dynamic_template_data`
 * filled from `input.data`.
 *
 * Failures (4xx/5xx, network) bubble up as caught exceptions — the calling
 * service decides whether to retry. We never throw `5xx` from the request
 * handler itself; the production service catches notifier errors and logs
 * them, so a SendGrid outage doesn't fail a QC upload.
 */
@Injectable()
export class SendGridNotificationProvider implements NotificationProvider {
  readonly name = 'sendgrid' as const;
  private readonly log = new Logger(SendGridNotificationProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly fromEmail: string,
    private readonly fromName: string,
    private readonly templates: Record<string, string>,
    private readonly baseUrl: string = 'https://api.sendgrid.com/v3',
  ) {}

  async send(input: SendNotificationInput): Promise<NotificationResult> {
    if (input.channel !== 'email') {
      throw new Error(`SendGrid only supports email; got channel=${input.channel}`);
    }
    const templateId = this.templates[input.templateKey];
    if (!templateId) {
      this.log.warn(
        `No SendGrid template_id configured for ${input.templateKey} — skipping send`,
      );
      return simulated(`unsent_${randomUUID().slice(0, 8)}`);
    }

    const body = {
      from: { email: this.fromEmail, name: this.fromName },
      personalizations: [
        {
          to: [{ email: input.to }],
          dynamic_template_data: input.data ?? {},
          ...(input.subject ? { subject: input.subject } : {}),
        },
      ],
      template_id: templateId,
    };

    const res = await fetch(`${this.baseUrl}/mail/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      throw new Error(`SendGrid ${res.status}: ${text.slice(0, 200)}`);
    }
    return {
      // SendGrid returns the message id in the `X-Message-Id` header.
      id: res.headers.get('x-message-id') ?? `sg_${randomUUID().slice(0, 8)}`,
      acceptedAt: new Date().toISOString(),
      simulated: false,
    };
  }
}

function simulated(id: string): NotificationResult {
  return { id, acceptedAt: new Date().toISOString(), simulated: true };
}
