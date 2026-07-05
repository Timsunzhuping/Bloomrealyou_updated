import type { PutObjectInput, PutObjectResult, StorageProvider } from '@custom-merch/shared';

import { FilesService } from './files.service';

const PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';

class RecordingStorage implements StorageProvider {
  readonly name = 'recording';
  readonly objects: PutObjectInput[] = [];

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    this.objects.push(input);
    const body =
      input.body instanceof ArrayBuffer
        ? Buffer.from(input.body)
        : Buffer.from(input.body);
    return {
      key: input.key,
      url: `/files/${input.key}`,
      size: body.length,
    };
  }

  async getSignedUrl(): Promise<string> {
    return '/signed';
  }

  async deleteObject(): Promise<void> {
    return undefined;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

describe('FilesService production exports', () => {
  const designJson = {
    productId: 'prod_1',
    productSlug: 'custom-t-shirts',
    variantId: 'variant_1',
    printArea: 'front',
    printAreaRect: { x: 200, y: 160, width: 400, height: 480 },
    safeAreaRect: { x: 220, y: 180, width: 360, height: 440 },
    canvas: {
      width: 800,
      height: 800,
      objects: [
        {
          id: 'text_1',
          type: 'text',
          text: 'Bloom',
          x: 240,
          y: 220,
          width: 200,
          height: 60,
          fontSize: 36,
          fontFamily: 'Inter',
          fontWeight: 700,
          color: '#111827',
          textAlign: 'center',
          opacity: 1,
          visible: true,
        },
      ],
    },
  };

  it('generates PNG, SVG, PDF, and source JSON artifacts', async () => {
    const storage = new RecordingStorage();
    const service = new FilesService(storage);

    const artifacts = await service.generateProduction(
      'design_1',
      designJson,
      PNG_DATA_URL,
      ['png', 'svg', 'pdf', 'json'],
    );

    expect(artifacts.map((a) => a.format)).toEqual(['png', 'svg', 'pdf', 'json']);
    expect(storage.objects.map((o) => o.key)).toEqual([
      'designs/design_1/production.png',
      'designs/design_1/production.svg',
      'designs/design_1/production.pdf',
      'designs/design_1/source.json',
    ]);
    expect(storage.objects.map((o) => o.contentType)).toEqual([
      'image/png',
      'image/svg+xml',
      'application/pdf',
      'application/json',
    ]);
  });

  it('skips PNG when no browser print render is provided but still emits server artifacts', async () => {
    const storage = new RecordingStorage();
    const service = new FilesService(storage);

    const artifacts = await service.generateProduction(
      'design_2',
      designJson,
      undefined,
      ['png', 'svg', 'pdf', 'json'],
    );

    expect(artifacts.map((a) => a.format)).toEqual(['svg', 'pdf', 'json']);
    expect(storage.objects.some((o) => o.key.endsWith('production.png'))).toBe(false);
  });
});
