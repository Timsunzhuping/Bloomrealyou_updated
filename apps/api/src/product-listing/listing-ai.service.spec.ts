import { ConfigService } from '@nestjs/config';

import { ListingAIService } from './listing-ai.service';

import type { ListingImage } from '@custom-merch/shared';

const PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=';
const image: ListingImage = {
  id: 'original',
  name: 'photo.png',
  url: 'https://assets.example.com/product.png',
  originalId: null,
  mode: 'original',
  approved: true,
};

describe('ListingAIService', () => {
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;
  const settings = {
    AI_PROVIDER: 'doubao',
    ARK_API_KEY: 'test-only-placeholder',
    ARK_BASE_URL: 'https://ark.example.test/api/v3',
    DOUBAO_TEXT_MODEL: 'text-model',
    DOUBAO_IMAGE_MODEL: 'image-model',
    LISTING_IMAGE_DAILY_LIMIT: '1',
  };
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });
  afterAll(() => {
    global.fetch = originalFetch;
  });
  const service = (overrides = {}) =>
    new ListingAIService(new ConfigService({ ...settings, ...overrides }));
  const respond = (data: unknown, status = 200) =>
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(data), { status }));

  it('uses guided mode and refuses enhancement when the model is unconfigured', async () => {
    const ai = service({ ARK_API_KEY: '' });
    expect(await ai.extract('Name: Test')).toBeNull();
    await expect(ai.enhance(image, 'clean', 'admin')).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only accepts evidenced fields and never accepts model-generated prices', async () => {
    respond({
      choices: [
        {
          message: {
            content: JSON.stringify({
              patch: { nameEn: 'Cotton Tee', material: 'Silk', price: '1.00' },
              evidence: { nameEn: '棉质T恤', material: 'Silk', price: '棉质T恤' },
            }),
          },
        },
      ],
    });
    const patch = await service().extract('名称：棉质T恤');
    expect(patch?.nameEn).toBe('Cotton Tee');
    expect(patch).not.toHaveProperty('price');
    expect(patch).not.toHaveProperty('material');
  });

  it('edits the stored original, uses base64 output and enforces the admin quota', async () => {
    respond({ data: [{ b64_json: PNG }] });
    const ai = service();
    const output = await ai.enhance(image, 'studio', 'admin');
    expect(output.contentType).toBe('image/png');
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://ark.example.test/api/v3/images/generations');
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'image-model',
      image: image.url,
      response_format: 'b64_json',
      watermark: true,
      sequential_image_generation: 'disabled',
    });
    await expect(ai.enhance(image, 'clean', 'admin')).rejects.toMatchObject({ status: 429 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns a safe failure without exposing provider errors or credentials', async () => {
    respond({ error: { message: 'provider detail must remain private' } }, 500);
    await expect(service().enhance(image, 'clean', 'admin')).rejects.toMatchObject({
      status: 503,
      response: { code: 'LISTING_IMAGE_FAILED' },
    });
  });
});
