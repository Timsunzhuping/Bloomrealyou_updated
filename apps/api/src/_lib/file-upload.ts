import { BadRequestException } from '@nestjs/common';

/**
 * Allowed mime types for user-uploaded artwork (RFQ logos, design files,
 * QC photos, etc.). The list is intentionally narrow — anything outside
 * gets rejected at the edge so executable / archive payloads never make it
 * to object storage.
 */
export const ALLOWED_UPLOAD_MIMES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
] as const;

export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIMES)[number];

/** 8 MB hard cap. RFQs / design proofs comfortably fit; anything bigger
 *  must go through the chunked upload pipeline. */
export const DEFAULT_MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Magic-number prefixes used as a sanity check on the declared mime. */
const MAGIC_NUMBERS: Record<string, Buffer[]> = {
  'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
  'image/jpeg': [Buffer.from([0xff, 0xd8, 0xff])],
  'image/webp': [Buffer.from('RIFF', 'ascii')],
  'application/pdf': [Buffer.from('%PDF-', 'ascii')],
};

interface ValidateInput {
  mime: string;
  buffer: Buffer;
  /** Override default 8 MB cap. */
  maxBytes?: number;
}

interface Validated {
  mime: AllowedUploadMime;
  buffer: Buffer;
}

/**
 * Validate a binary blob the platform is about to write to object storage.
 *
 * The function:
 *   1. Rejects unknown mime types (the allow-list above is exhaustive).
 *   2. Caps payload size to {@link DEFAULT_MAX_UPLOAD_BYTES} (overrideable).
 *   3. Cross-checks the magic-number prefix against the declared mime — a
 *      `.exe` rebadged as `image/png` is the classic attack we block here.
 *   4. For SVGs (which are XML) strips inline `<script>` / event handlers
 *      and rejects payloads that smuggle external entities. The result is
 *      a sanitised buffer the caller can safely persist.
 *
 * Throws `BadRequestException` so Nest serialises a clean 400 body.
 */
export function validateUpload(input: ValidateInput): Validated {
  const max = input.maxBytes ?? DEFAULT_MAX_UPLOAD_BYTES;
  if (input.buffer.byteLength === 0) {
    throw new BadRequestException('Empty upload');
  }
  if (input.buffer.byteLength > max) {
    throw new BadRequestException(
      `Upload exceeds ${(max / (1024 * 1024)).toFixed(1)} MB cap`,
    );
  }
  const mime = input.mime.toLowerCase();
  if (!isAllowedMime(mime)) {
    throw new BadRequestException(`Unsupported upload type: ${input.mime}`);
  }
  const magic = MAGIC_NUMBERS[mime];
  if (magic && !magic.some((m) => input.buffer.subarray(0, m.byteLength).equals(m))) {
    throw new BadRequestException(`File contents do not match declared type ${input.mime}`);
  }
  if (mime === 'image/svg+xml') {
    return { mime, buffer: sanitiseSvg(input.buffer) };
  }
  return { mime, buffer: input.buffer };
}

export function isAllowedMime(mime: string): mime is AllowedUploadMime {
  return (ALLOWED_UPLOAD_MIMES as readonly string[]).includes(mime);
}

const SVG_DANGEROUS = /<script\b[\s\S]*?<\/script>|on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const SVG_FOREIGN = /<(foreignObject|iframe|embed|object)\b/i;
const SVG_DOCTYPE_ENTITY = /<!ENTITY/i;
const SVG_HREF_JS = /\b(?:href|xlink:href)\s*=\s*("javascript:[^"]*"|'javascript:[^']*')/gi;

/**
 * Defensive scrubbing for SVG payloads.
 *
 * A full XML sanitiser is overkill for our use case — RFQ logos and template
 * thumbnails. Instead we:
 *   - hard-reject any DOCTYPE entity declarations (XXE vector)
 *   - hard-reject foreignObject / iframe / embed / object tags
 *   - strip inline `<script>…</script>` blocks
 *   - strip `onclick=…` / `onload=…` event handler attributes
 *   - strip `href="javascript:…"` style links
 *
 * The result is a buffer safe to render from a sandboxed `<img>` tag. SVGs
 * served as raw `<svg>` should still go through a CSP that disallows inline
 * scripts; this function is defence-in-depth, not the only line.
 */
export function sanitiseSvg(buffer: Buffer): Buffer {
  const text = buffer.toString('utf8');
  if (SVG_DOCTYPE_ENTITY.test(text)) {
    throw new BadRequestException('SVG external entity declarations are not allowed');
  }
  if (SVG_FOREIGN.test(text)) {
    throw new BadRequestException('SVG embedded foreign objects are not allowed');
  }
  const sanitised = text
    .replace(SVG_DANGEROUS, '')
    .replace(SVG_HREF_JS, '');
  return Buffer.from(sanitised, 'utf8');
}

/** Simple data-URL parser tied to the upload allow-list. */
export function parseAllowedDataUrl(
  dataUrl: string,
  opts?: { maxBytes?: number },
): Validated {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new BadRequestException('Invalid data URL');
  const mime = match[1] ?? '';
  const buffer = Buffer.from(match[2] ?? '', 'base64');
  return validateUpload({ mime, buffer, maxBytes: opts?.maxBytes });
}
