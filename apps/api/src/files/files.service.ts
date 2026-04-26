import { Inject, Injectable, Logger } from '@nestjs/common';

import type { ProductionArtifact, StorageProvider } from '@custom-merch/shared';

import { STORAGE_PROVIDER } from '../storage/storage.tokens';

interface DataUrlParts {
  mime: string;
  buffer: Buffer;
}

const SUPPORTED_PREVIEW_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

/**
 * Parse a `data:` URL into raw bytes + content type. Returns null when the
 * input is not a recognisable data URL.
 */
export function parseDataUrl(dataUrl: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match as unknown as [string, string, string];
  return { mime, buffer: Buffer.from(base64, 'base64') };
}

/**
 * Build the storage key for a design artefact. Layout:
 *   designs/{designId}/preview.png
 *   designs/{designId}/production.png
 *   designs/{designId}/source.json
 */
export function designStorageKey(
  designId: string,
  artefact: 'preview' | 'production' | 'source',
  ext: string,
): string {
  return `designs/${designId}/${artefact}.${ext}`;
}

@Injectable()
export class FilesService {
  private readonly log = new Logger(FilesService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  /** Upload a client-rendered preview image. Falls back to a 1×1 PNG when omitted. */
  async uploadPreview(designId: string, dataUrl?: string): Promise<{ url: string; size: number }> {
    let parts = dataUrl ? parseDataUrl(dataUrl) : null;
    if (!parts || !SUPPORTED_PREVIEW_MIME.has(parts.mime)) {
      // Server-side fallback: 1×1 transparent PNG.
      parts = { mime: 'image/png', buffer: TRANSPARENT_PNG };
    }
    const ext = MIME_TO_EXT[parts.mime] ?? 'png';
    const result = await this.storage.putObject({
      key: designStorageKey(designId, 'preview', ext),
      body: parts.buffer,
      contentType: parts.mime,
      cacheControl: 'public, max-age=300',
    });
    return { url: result.url, size: result.size };
  }

  /** Persist the source JSON snapshot. */
  async uploadSourceJson(
    designId: string,
    json: Record<string, unknown>,
  ): Promise<{ url: string; size: number }> {
    const buffer = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
    const result = await this.storage.putObject({
      key: designStorageKey(designId, 'source', 'json'),
      body: buffer,
      contentType: 'application/json',
    });
    return { url: result.url, size: result.size };
  }

  /**
   * Generate production artefacts. The MVP duplicates the preview as the
   * production PNG and persists the source JSON; SVG / PDF rendering is left
   * to a follow-up because it requires a headless browser pipeline.
   */
  async generateProduction(
    designId: string,
    designJson: Record<string, unknown>,
    previewDataUrl: string | undefined,
    formats: Array<'png' | 'svg' | 'pdf' | 'json'>,
  ): Promise<ProductionArtifact[]> {
    const out: ProductionArtifact[] = [];

    if (formats.includes('png')) {
      const parts = previewDataUrl ? parseDataUrl(previewDataUrl) : null;
      const buffer = parts?.buffer ?? TRANSPARENT_PNG;
      const result = await this.storage.putObject({
        key: designStorageKey(designId, 'production', 'png'),
        body: buffer,
        contentType: 'image/png',
      });
      out.push({ format: 'png', url: result.url, size: result.size });
    }

    if (formats.includes('json')) {
      const result = await this.uploadSourceJson(designId, designJson);
      out.push({ format: 'json', url: result.url, size: result.size });
    }

    if (formats.includes('svg') || formats.includes('pdf')) {
      this.log.log(
        `[files] svg/pdf production output is queued for the renderer service (design=${designId}). Skipping in MVP.`,
      );
    }

    return out;
  }
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** 1×1 fully-transparent PNG used as a safe fallback. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64',
);
