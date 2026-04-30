import { Injectable, Logger } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';

import type {
  NotificationBatchResult,
  NotificationProvider,
  NotificationResult,
  SendBatchNotificationInput,
  SendNotificationInput,
} from '@custom-merch/shared';

/**
 * Amazon SES v2 email adapter using AWS Signature V4.
 *
 * The platform doesn't bundle `@aws-sdk/client-sesv2` to keep the runtime
 * footprint small — instead we sign each request manually with the same
 * AWS credentials already required by the S3 storage provider. This stays
 * vendor-light and keeps cold-start fast.
 *
 * Templates are looked up by name in SES (`SES_TEMPLATES` env JSON maps our
 * `templateKey` → SES template name). The send call includes the
 * `template_data` JSON-encoded so SES can perform the substitutions
 * server-side.
 */
@Injectable()
export class SesNotificationProvider implements NotificationProvider {
  readonly name = 'ses' as const;
  private readonly log = new Logger(SesNotificationProvider.name);

  constructor(
    private readonly accessKeyId: string,
    private readonly secretAccessKey: string,
    private readonly region: string,
    private readonly fromEmail: string,
    private readonly templates: Record<string, string>,
  ) {}

  async send(input: SendNotificationInput): Promise<NotificationResult> {
    if (input.channel !== 'email') {
      throw new Error(`SES only supports email; got channel=${input.channel}`);
    }
    const templateName = this.templates[input.templateKey];
    if (!templateName) {
      this.log.warn(`No SES template configured for ${input.templateKey} — skipping send`);
      return { id: `unsent_${randomUUID().slice(0, 8)}`, acceptedAt: new Date().toISOString(), simulated: true };
    }

    const host = `email.${this.region}.amazonaws.com`;
    const path = '/v2/email/outbound-emails';
    const payload = JSON.stringify({
      FromEmailAddress: this.fromEmail,
      Destination: { ToAddresses: [input.to] },
      Content: {
        Template: {
          TemplateName: templateName,
          TemplateData: JSON.stringify(input.data ?? {}),
        },
      },
    });

    const signed = sigV4Sign({
      accessKeyId: this.accessKeyId,
      secretAccessKey: this.secretAccessKey,
      region: this.region,
      service: 'ses',
      method: 'POST',
      host,
      path,
      payload,
    });

    const res = await fetch(`https://${host}${path}`, {
      method: 'POST',
      headers: signed.headers,
      body: payload,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      throw new Error(`SES ${res.status}: ${text.slice(0, 200)}`);
    }
    const body = (await res.json()) as { MessageId?: string };
    return {
      id: body.MessageId ?? `ses_${randomUUID().slice(0, 8)}`,
      acceptedAt: new Date().toISOString(),
      simulated: false,
    };
  }

  /**
   * SES v2 supports up to 50 recipients per `SendBulkEmail` request. We chunk
   * larger inputs and merge results. Per-recipient errors come back in the
   * response's `BulkEmailEntryResults[]` and are mapped 1:1 onto our
   * `results` array.
   */
  async sendBatch(input: SendBatchNotificationInput): Promise<NotificationBatchResult> {
    if (input.channel !== 'email') {
      throw new Error(`SES only supports email; got channel=${input.channel}`);
    }
    const templateName = this.templates[input.templateKey];
    const acceptedAt = new Date().toISOString();
    const results: NotificationBatchResult['results'] = [];

    if (!templateName) {
      this.log.warn(`No SES template configured for ${input.templateKey} — skipping batch`);
      for (const _r of input.recipients) {
        results.push({ id: `unsent_${randomUUID().slice(0, 8)}`, acceptedAt, simulated: true });
      }
      return {
        batchId: `ses-batch-skipped_${randomUUID().slice(0, 8)}`,
        acceptedAt,
        results,
        simulated: true,
      };
    }

    const host = `email.${this.region}.amazonaws.com`;
    const path = '/v2/email/outbound-bulk-emails';
    const chunks = chunkBy(input.recipients, MAX_BULK_RECIPIENTS);

    for (const chunk of chunks) {
      const payload = JSON.stringify({
        FromEmailAddress: this.fromEmail,
        DefaultContent: {
          Template: {
            TemplateName: templateName,
            TemplateData: JSON.stringify(input.commonData ?? {}),
          },
        },
        BulkEmailEntries: chunk.map((r) => ({
          Destination: { ToAddresses: [r.to] },
          ReplacementEmailContent: {
            ReplacementTemplate: {
              ReplacementTemplateData: JSON.stringify(r.data ?? {}),
            },
          },
        })),
      });

      const signed = sigV4Sign({
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
        region: this.region,
        service: 'ses',
        method: 'POST',
        host,
        path,
        payload,
      });

      try {
        const res = await fetch(`https://${host}${path}`, {
          method: 'POST',
          headers: signed.headers,
          body: payload,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '<no body>');
          for (const r of chunk) results.push({ to: r.to, error: `SES ${res.status}: ${text.slice(0, 120)}` });
          continue;
        }
        const body = (await res.json()) as { BulkEmailEntryResults?: Array<{ MessageId?: string; Status?: string; Error?: string }> };
        const entries = body.BulkEmailEntryResults ?? [];
        for (let i = 0; i < chunk.length; i += 1) {
          const entry = entries[i];
          if (entry?.Status && entry.Status !== 'SUCCESS') {
            results.push({ to: chunk[i]!.to, error: `${entry.Status}: ${entry.Error ?? 'unknown'}` });
          } else {
            results.push({
              id: entry?.MessageId ?? `ses-batch_${randomUUID().slice(0, 8)}`,
              acceptedAt,
              simulated: false,
            });
          }
        }
      } catch (e) {
        for (const r of chunk) results.push({ to: r.to, error: (e as Error).message });
      }
    }

    return {
      batchId: `ses-batch_${randomUUID().slice(0, 8)}`,
      acceptedAt,
      results,
      simulated: false,
    };
  }
}

const MAX_BULK_RECIPIENTS = 50;

function chunkBy<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

interface SignInput {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  method: string;
  host: string;
  path: string;
  payload: string;
}

interface SignResult {
  headers: Record<string, string>;
}

/**
 * Minimal AWS Signature V4 implementation. Avoids the full SDK.
 * Reference: https://docs.aws.amazon.com/general/latest/gr/sigv4_signing.html
 */
function sigV4Sign(input: SignInput): SignResult {
  const now = new Date();
  const amzDate = now
    .toISOString()
    .replace(/[:-]/g, '')
    .replace(/\.\d{3}/, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update(input.payload).digest('hex');

  const canonicalHeaders =
    `host:${input.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = `${input.method}\n${input.path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  const credentialScope = `${dateStamp}/${input.region}/${input.service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${createHash('sha256').update(canonicalRequest).digest('hex')}`;

  const kDate = createHmac('sha256', `AWS4${input.secretAccessKey}`).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(input.region).digest();
  const kService = createHmac('sha256', kRegion).update(input.service).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    headers: {
      host: input.host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      authorization,
      'content-type': 'application/json',
    },
  };
}
