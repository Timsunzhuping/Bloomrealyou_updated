/**
 * Adapter contract for object storage (MinIO / S3 / R2).
 *
 * The platform never imports a concrete client directly — every code path
 * goes through this interface so providers can be swapped without touching
 * business logic.
 */

export interface PutObjectInput {
  /** Storage key including the business path, e.g. `designs/{id}/preview.png`. */
  key: string;
  /** Raw bytes to upload. */
  body: Buffer | Uint8Array | ArrayBuffer;
  /** MIME type recorded with the object. */
  contentType: string;
  /** Optional cache-control header for CDN edges. */
  cacheControl?: string;
  /** Optional metadata persisted with the object. */
  metadata?: Record<string, string>;
}

export interface PutObjectResult {
  /** Storage key (echoes input.key). */
  key: string;
  /** Publicly browsable URL when the bucket is public, otherwise an internal URL. */
  url: string;
  /** ETag returned by the provider when available. */
  etag?: string;
  /** Object size in bytes. */
  size: number;
}

export interface SignedUrlInput {
  key: string;
  /** Validity window in seconds. */
  expiresInSeconds: number;
  /** Override the response content type (forces download / inline render). */
  responseContentType?: string;
}

export interface StorageProvider {
  /** Identifier surfaced in logs / health endpoints. */
  readonly name: string;

  /** Upload an object. Implementations decide whether to overwrite. */
  putObject(input: PutObjectInput): Promise<PutObjectResult>;

  /** Generate a time-limited signed URL for private-bucket reads. */
  getSignedUrl(input: SignedUrlInput): Promise<string>;

  /** Delete by key. No-ops on missing keys. */
  deleteObject(key: string): Promise<void>;

  /** True when the provider can reach its backing store. */
  healthCheck(): Promise<boolean>;
}
