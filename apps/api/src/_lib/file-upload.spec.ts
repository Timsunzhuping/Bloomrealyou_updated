import { BadRequestException } from '@nestjs/common';

import { parseAllowedDataUrl, sanitiseSvg, validateUpload } from './file-upload';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const PDF_MAGIC = Buffer.from('%PDF-1.4 hello', 'utf8');

describe('validateUpload', () => {
  it('accepts a real PNG payload', () => {
    const out = validateUpload({ mime: 'image/png', buffer: PNG_MAGIC });
    expect(out.mime).toBe('image/png');
    expect(out.buffer).toBe(PNG_MAGIC);
  });

  it('accepts JPEG and PDF', () => {
    expect(validateUpload({ mime: 'image/jpeg', buffer: JPEG_MAGIC }).mime).toBe('image/jpeg');
    expect(validateUpload({ mime: 'application/pdf', buffer: PDF_MAGIC }).mime).toBe(
      'application/pdf',
    );
  });

  it('rejects unsupported mime types', () => {
    expect(() =>
      validateUpload({ mime: 'application/x-msdownload', buffer: Buffer.from('MZ') }),
    ).toThrow(BadRequestException);
    expect(() =>
      validateUpload({ mime: 'application/zip', buffer: Buffer.from('PK') }),
    ).toThrow(BadRequestException);
  });

  it('rejects empty payloads', () => {
    expect(() => validateUpload({ mime: 'image/png', buffer: Buffer.alloc(0) })).toThrow(
      BadRequestException,
    );
  });

  it('rejects oversized payloads', () => {
    const big = Buffer.concat([PNG_MAGIC, Buffer.alloc(10)]);
    expect(() => validateUpload({ mime: 'image/png', buffer: big, maxBytes: 8 })).toThrow(
      /exceeds/,
    );
  });

  it('rejects mime/magic mismatch (rebadged executable)', () => {
    const fakePng = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // Windows PE header
    expect(() => validateUpload({ mime: 'image/png', buffer: fakePng })).toThrow(
      /do not match declared type/,
    );
  });

  it('strips inline scripts and event handlers from SVG', () => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle onclick="alert(2)" cx="0" cy="0"/></svg>`;
    const out = validateUpload({
      mime: 'image/svg+xml',
      buffer: Buffer.from(svg, 'utf8'),
    });
    const text = out.buffer.toString('utf8');
    expect(text).not.toContain('<script');
    expect(text).not.toContain('onclick');
  });

  it('rejects SVGs with DOCTYPE entity declarations (XXE)', () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg/>`;
    expect(() =>
      validateUpload({ mime: 'image/svg+xml', buffer: Buffer.from(xxe, 'utf8') }),
    ).toThrow(/external entity/);
  });

  it('rejects SVGs with foreignObject', () => {
    const evil = `<svg><foreignObject><iframe src="x"/></foreignObject></svg>`;
    expect(() =>
      sanitiseSvg(Buffer.from(evil, 'utf8')),
    ).toThrow(/foreign objects/);
  });

  it('parseAllowedDataUrl wires the validator through the data-URL path', () => {
    const dataUrl = `data:image/png;base64,${PNG_MAGIC.toString('base64')}`;
    const out = parseAllowedDataUrl(dataUrl);
    expect(out.mime).toBe('image/png');
  });

  it('parseAllowedDataUrl rejects malformed input', () => {
    expect(() => parseAllowedDataUrl('not a data url')).toThrow(BadRequestException);
  });
});
