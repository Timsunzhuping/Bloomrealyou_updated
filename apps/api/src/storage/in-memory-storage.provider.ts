import { Injectable, Logger } from '@nestjs/common';

import type {
  PutObjectInput,
  PutObjectResult,
  SignedUrlInput,
  StorageProvider,
} from '@custom-merch/shared';

/**
 * In-memory provider used in development when MinIO/S3 is not reachable, and
 * in unit tests. Generates `data:` URLs for previews so the front-end can
 * still render the saved artefact without a real object store.
 */
@Injectable()
export class InMemoryStorageProvider implements StorageProvider {
  readonly name = 'in-memory';
  private readonly log = new Logger(InMemoryStorageProvider.name);
  private readonly objects = new Map<
    string,
    { body: Buffer; contentType: string; size: number }
  >();

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const body = toBuffer(input.body);
    this.objects.set(input.key, {
      body,
      contentType: input.contentType,
      size: body.length,
    });
    this.log.debug(`stored ${input.key} (${body.length} bytes, ${input.contentType})`);
    return {
      key: input.key,
      url: `data:${input.contentType};base64,${body.toString('base64')}`,
      size: body.length,
    };
  }

  async getSignedUrl(input: SignedUrlInput): Promise<string> {
    const obj = this.objects.get(input.key);
    if (!obj) return `data:${input.responseContentType ?? 'text/plain'};base64,`;
    return `data:${obj.contentType};base64,${obj.body.toString('base64')}`;
  }

  async deleteObject(key: string): Promise<void> {
    this.objects.delete(key);
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

function toBuffer(body: PutObjectInput['body']): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return Buffer.from(body);
}
