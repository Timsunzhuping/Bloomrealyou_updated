import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger } from '@nestjs/common';

import type {
  PutObjectInput,
  PutObjectResult,
  SignedUrlInput,
  StorageProvider,
} from '@custom-merch/shared';

export interface MinioStorageOptions {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** True when the endpoint requires path-style addressing (default for MinIO). */
  forcePathStyle: boolean;
  /** Public-facing base URL used to compose object URLs (defaults to endpoint). */
  publicBaseUrl?: string;
}

/**
 * S3-compatible provider. Works against MinIO in development and AWS S3 / R2
 * in production by swapping `endpoint` + `forcePathStyle` env vars.
 */
@Injectable()
export class MinioStorageProvider implements StorageProvider {
  readonly name = 'minio';
  private readonly log = new Logger(MinioStorageProvider.name);
  private readonly client: S3Client;

  constructor(private readonly options: MinioStorageOptions) {
    const cfg: S3ClientConfig = {
      endpoint: options.endpoint,
      region: options.region,
      credentials: {
        accessKeyId: options.accessKeyId,
        secretAccessKey: options.secretAccessKey,
      },
      forcePathStyle: options.forcePathStyle,
    };
    this.client = new S3Client(cfg);
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    const body = toBuffer(input.body);
    const cmd = new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl,
      Metadata: input.metadata,
    });
    const out = await this.client.send(cmd);
    const url = this.composeUrl(input.key);
    this.log.debug(`PUT ${input.key} (${body.length} bytes)`);
    return { key: input.key, url, etag: out.ETag, size: body.length };
  }

  async getSignedUrl(input: SignedUrlInput): Promise<string> {
    const cmd = new GetObjectCommand({
      Bucket: this.options.bucket,
      Key: input.key,
      ResponseContentType: input.responseContentType,
    });
    return getSignedUrl(this.client, cmd, { expiresIn: input.expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: key }));
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.options.bucket }));
      return true;
    } catch (err) {
      this.log.warn(`storage health check failed: ${(err as Error).message}`);
      return false;
    }
  }

  private composeUrl(key: string): string {
    const base = this.options.publicBaseUrl ?? this.options.endpoint;
    const trimmed = base.replace(/\/$/, '');
    if (this.options.forcePathStyle) {
      return `${trimmed}/${this.options.bucket}/${key}`;
    }
    return `${trimmed.replace('://', `://${this.options.bucket}.`)}/${key}`;
  }
}

function toBuffer(body: PutObjectInput['body']): Buffer {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  return Buffer.from(body);
}
