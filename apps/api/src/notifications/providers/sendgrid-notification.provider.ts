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
    const body = templateId
      ? buildVendorBody(input, templateId, this.fromEmail, this.fromName)
      : buildInlineBody(input, this.fromEmail, this.fromName);

    if (!body) {
      this.log.warn(
        `No SendGrid template_id and no local fallback for ${input.templateKey} — skipping send`,
      );
      return simulated(`unsent_${randomUUID().slice(0, 8)}`);
    }

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

  /**
   * SendGrid supports up to 1 000 personalizations in a single `mail/send`
   * call. We chunk inputs into batches of {@link MAX_PERSONALIZATIONS} so a
   * very large fan-out (e.g. an enterprise launch list) splits cleanly across
   * multiple HTTP calls. Per-recipient failures are reported individually
   * but a chunk-level error surfaces as one error per affected recipient.
   */
  async sendBatch(input: SendBatchNotificationInput): Promise<NotificationBatchResult> {
    if (input.channel !== 'email') {
      throw new Error(`SendGrid only supports email; got channel=${input.channel}`);
    }
    const templateId = this.templates[input.templateKey];
    const acceptedAt = new Date().toISOString();
    const results: NotificationBatchResult['results'] = [];

    if (!templateId) {
      this.log.warn(
        `No SendGrid template_id configured for ${input.templateKey} — skipping batch`,
      );
      for (const r of input.recipients) {
        results.push(simulated(`unsent_${randomUUID().slice(0, 8)}`));
      }
      return { batchId: `sg-batch-skipped_${randomUUID().slice(0, 8)}`, acceptedAt, results, simulated: true };
    }

    const chunks = chunkBy(input.recipients, MAX_PERSONALIZATIONS);
    let chunkIndex = 0;
    for (const chunk of chunks) {
      const body = {
        from: { email: this.fromEmail, name: this.fromName },
        personalizations: chunk.map((r) => ({
          to: [{ email: r.to }],
          dynamic_template_data: { ...(input.commonData ?? {}), ...(r.data ?? {}) },
          ...((r.subject ?? input.subject) ? { subject: r.subject ?? input.subject } : {}),
        })),
        template_id: templateId,
      };

      try {
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
          for (const r of chunk) results.push({ to: r.to, error: `SendGrid ${res.status}: ${text.slice(0, 120)}` });
          continue;
        }
        // SendGrid returns one message id per personalization in the body of
        // the X-Message-Id header (best-effort — older accounts return one id
        // per request). We synthesise per-recipient ids when needed.
        const headerId = res.headers.get('x-message-id') ?? `sg-batch_${randomUUID().slice(0, 8)}`;
        for (let i = 0; i < chunk.length; i += 1) {
          results.push({
            id: `${headerId}.${chunkIndex}.${i}`,
            acceptedAt,
            simulated: false,
          });
        }
      } catch (e) {
        for (const r of chunk) results.push({ to: r.to, error: (e as Error).message });
      }
      chunkIndex += 1;
    }
    return {
      batchId: `sg-batch_${randomUUID().slice(0, 8)}`,
      acceptedAt,
      results,
      simulated: false,
    };
  }
}

function buildVendorBody(
  input: SendNotificationInput,
  templateId: string,
  fromEmail: string,
  fromName: string,
): Record<string, unknown> {
  return {
    from: { email: fromEmail, name: fromName },
    personalizations: [
      {
        to: [{ email: input.to }],
        dynamic_template_data: input.data ?? {},
        ...(input.subject ? { subject: input.subject } : {}),
      },
    ],
    template_id: templateId,
  };
}

/**
 * Local-template fallback. When the platform hasn't configured a SendGrid
 * `template_id` for `templateKey`, we render the in-repo i18n template
 * instead and send via SendGrid's "raw content" API. This means a fresh
 * deploy works end-to-end before anyone uploads SendGrid templates.
 *
 * Returns null when no local template exists either; the caller falls back
 * to a simulated result.
 */
function buildInlineBody(
  input: SendNotificationInput,
  fromEmail: string,
  fromName: string,
): Record<string, unknown> | null {
  const tpl = resolveTemplate(input.templateKey, input.locale);
  if (!tpl) return null;
  const rendered = renderTemplate(tpl, input.data ?? {});
  return {
    from: { email: fromEmail, name: fromName },
    personalizations: [
      {
        to: [{ email: input.to }],
        subject: input.subject ?? rendered.subject,
      },
    ],
    subject: input.subject ?? rendered.subject,
    content: [
      { type: 'text/plain', value: rendered.text },
      ...(rendered.html ? [{ type: 'text/html', value: rendered.html }] : []),
    ],
  };
}

const MAX_PERSONALIZATIONS = 1000;

function chunkBy<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function simulated(id: string): NotificationResult {
  return { id, acceptedAt: new Date().toISOString(), simulated: true };
}
