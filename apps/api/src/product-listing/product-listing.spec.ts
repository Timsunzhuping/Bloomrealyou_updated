import { ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { SnapshotStore } from '../_lib/snapshot-store';
import { AppModule } from '../app.module';
import { InMemoryStorageProvider } from '../storage/in-memory-storage.provider';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';

import { ListingAIService, readRasterDataUrl } from './listing-ai.service';
import { guidedPatch, priceMinor } from './listing-rules';
import { ProductListingService } from './product-listing.service';

import type { NestExpressApplication } from '@nestjs/platform-express';
import type { AdminUserDto } from '@custom-merch/shared';

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=';
const fields = {
  nameEn: 'Cotton Test Tee',
  nameZh: '测试棉质T恤',
  category: 't-shirts',
  slug: 'test-cotton-tee',
  price: '26.04',
  currency: 'USD',
  material: '100% cotton',
  colors: ['White'],
  sizes: ['M', 'L'],
  productionLeadDays: 5,
  descriptionEn: 'Cotton T-shirt with a regular fit.',
};

describe('Product listing workflow', () => {
  let app: NestExpressApplication;
  let token: string;
  let other: string;
  let actor: AdminUserDto;
  const snapshots = {
    loadAll: jest.fn().mockResolvedValue([]),
    loadAllConfirmed: jest.fn().mockResolvedValue([]),
    put: jest.fn(),
    remove: jest.fn(),
    putBatchConfirmed: jest.fn().mockResolvedValue(undefined),
  };
  const ai = {
    extract: jest.fn().mockResolvedValue(null),
    enhance: jest.fn().mockResolvedValue(readRasterDataUrl(PNG)),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SnapshotStore)
      .useValue(snapshots)
      .overrideProvider(STORAGE_PROVIDER)
      .useValue(new InMemoryStorageProvider())
      .overrideProvider(ListingAIService)
      .useValue(ai)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useBodyParser('json', { limit: '8mb' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
    const admin = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'admin@bloomrealyou.com', password: 'admin123' });
    token = admin.body.token;
    actor = admin.body.user;
    const finance = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ email: 'finance@bloomrealyou.com', password: 'finance123' });
    other = finance.body.token;
  });
  afterAll(async () => {
    await app?.close();
  });
  const call = (method: 'get' | 'post' | 'patch', path: string, body?: object) =>
    request(app.getHttpServer())
      [method](`/admin/product-listings${path}`)
      .auth(token, { type: 'bearer' })
      .send(body);
  async function create() {
    return (await call('post', '', { locale: 'zh-CN' }).expect(201)).body;
  }

  it('requires product-write permission and authentication', async () => {
    await request(app.getHttpServer()).get('/admin/product-listings').expect(401);
    await request(app.getHttpServer())
      .post('/admin/product-listings')
      .auth(other, { type: 'bearer' })
      .send({})
      .expect(401);
  });
  it('rejects unknown fields and missing revision', async () => {
    const s = await create();
    await call('patch', `/${s.id}`, { patch: { price: '10.00' } }).expect(400);
    await call('patch', `/${s.id}`, { revision: 0, patch: { status: 'active' } }).expect(400);
    await call('patch', `/${s.id}`, { revision: 0, patch: null }).expect(400);
  });
  it("does not expose another administrator's listing", async () => {
    const s = await create();
    const service = app.get(ProductListingService);
    const another = { ...actor, id: 'another-admin' };
    expect(service.list(another)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: s.id })]),
    );
    expect(() => service.get(s.id, another)).toThrow('Listing not found');
    await expect(service.patch(s.id, 0, { price: '1.00' }, another)).rejects.toThrow(
      'Listing not found',
    );
  });
  it('keeps saved drafts out of the public catalogue and cart', async () => {
    let s = await create();
    s = (
      await call('patch', `/${s.id}`, {
        revision: 0,
        patch: { ...fields, slug: 'draft-only-tee' },
      }).expect(200)
    ).body;
    s = (
      await call('post', `/${s.id}/commit`, {
        revision: s.revision,
        status: 'draft',
        confirmed: true,
      }).expect(201)
    ).body;
    expect(s.state).toBe('saved');
    await request(app.getHttpServer()).get('/products/draft-only-tee').expect(404);
    await request(app.getHttpServer())
      .post('/cart/items')
      .send({ productId: s.productId, variantId: 'any-variant', quantity: 1 })
      .expect(404);
  });
  it('continues the conversation without a model and never publishes implicitly', async () => {
    const s = await create();
    const next = (
      await call('post', `/${s.id}/messages`, {
        revision: 0,
        message:
          '名称：棉质T恤；售价：26.04 USD；生产周期：5天；颜色：白色；尺码：M, L；分类：T恤；请立即上架',
      }).expect(201)
    ).body;
    expect(next.draft.price).toBe('26.04');
    expect(next.draft.category).toBe('t-shirts');
    expect(next.source).toBe('guided');
    expect(next.productId).toBeNull();
    expect(next.missing).toContain('nameEn');
    await call('post', `/${s.id}/commit`, {
      revision: 1,
      status: 'active',
      confirmed: false,
    }).expect(400);
    await call('post', `/${s.id}/commit`, {
      revision: 1,
      status: 'active',
      confirmed: true,
    }).expect(400);
  });
  it('rejects stale edits', async () => {
    const s = await create();
    await call('patch', `/${s.id}`, { revision: 0, patch: { nameEn: 'First' } }).expect(200);
    await call('patch', `/${s.id}`, { revision: 0, patch: { nameEn: 'Second' } }).expect(409);
  });
  it('validates raster upload type and preserves the original after model failure', async () => {
    let s = await create();
    await call('post', `/${s.id}/images`, {
      revision: 0,
      name: 'bad.svg',
      dataUrl: 'data:image/svg+xml;base64,PHN2Zy8+',
    }).expect(400);
    s = (
      await call('post', `/${s.id}/images`, {
        revision: 0,
        name: 'original.png',
        dataUrl: PNG,
      }).expect(201)
    ).body;
    ai.enhance.mockRejectedValueOnce(new Error('unavailable'));
    await call('post', `/${s.id}/enhance`, {
      revision: 1,
      imageId: s.images[0].id,
      mode: 'studio',
    }).expect(500);
    const original = (await call('get', `/${s.id}`).expect(200)).body;
    expect(original.revision).toBe(1);
    expect(original.images).toHaveLength(1);
    expect(original.mainImageId).toBe(s.mainImageId);
  });
  it('requires human approval of enhanced images before publication', async () => {
    let s = await create();
    s = (
      await call('patch', `/${s.id}`, {
        revision: 0,
        patch: { ...fields, slug: 'enhanced-test' },
      }).expect(200)
    ).body;
    s = (
      await call('post', `/${s.id}/images`, {
        revision: s.revision,
        name: 'photo.png',
        dataUrl: PNG,
      }).expect(201)
    ).body;
    s = (
      await call('post', `/${s.id}/enhance`, {
        revision: s.revision,
        imageId: s.images[0].id,
        mode: 'clean',
      }).expect(201)
    ).body;
    const generated = s.images[1].id;
    s = (
      await call('post', `/${s.id}/image-selection`, {
        revision: s.revision,
        selectedImageIds: [generated],
        mainImageId: generated,
      }).expect(201)
    ).body;
    await call('post', `/${s.id}/commit`, {
      revision: s.revision,
      status: 'active',
      confirmed: true,
    }).expect(400);
    s = (
      await call('post', `/${s.id}/image-selection`, {
        revision: s.revision,
        selectedImageIds: [generated],
        mainImageId: generated,
        approveImageId: generated,
      }).expect(201)
    ).body;
    expect(s.missing).toEqual([]);
  });
  it('atomically publishes once, exposes live catalogue prices and supports adding to cart', async () => {
    let s = await create();
    s = (await call('patch', `/${s.id}`, { revision: 0, patch: fields }).expect(200)).body;
    s = (
      await call('post', `/${s.id}/images`, {
        revision: 1,
        name: 'photo.png',
        dataUrl: PNG,
      }).expect(201)
    ).body;
    const published = (
      await call('post', `/${s.id}/commit`, {
        revision: s.revision,
        status: 'active',
        confirmed: true,
      }).expect(201)
    ).body;
    const again = (
      await call('post', `/${s.id}/commit`, {
        revision: s.revision,
        status: 'active',
        confirmed: true,
      }).expect(201)
    ).body;
    expect(again.productId).toBe(published.productId);
    expect(snapshots.putBatchConfirmed).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'admin_product', entityId: published.productId }),
        expect.objectContaining({ kind: 'product_listing', entityId: s.id }),
      ]),
    );
    const product = (
      await request(app.getHttpServer()).get('/products/test-cotton-tee').expect(200)
    ).body;
    expect(product.basePrice).toEqual({ amountMinor: 2604, currency: 'USD' });
    const variants = (
      await request(app.getHttpServer()).get(`/products/by-id/${product.id}/variants`).expect(200)
    ).body;
    expect(variants).toHaveLength(2);
    expect(new Set(variants.map((v: { sku: string }) => v.sku)).size).toBe(2);
    const cart = await request(app.getHttpServer())
      .post('/cart/items')
      .send({ productId: product.id, variantId: variants[0].id, quantity: 1 })
      .expect(201);
    expect(cart.body.items[0].unitPrice.amountMinor).toBe(2604);
    const duplicate = await create();
    await call('patch', `/${duplicate.id}`, { revision: 0, patch: fields }).expect(200);
    await call('post', `/${duplicate.id}/commit`, {
      revision: 1,
      status: 'draft',
      confirmed: true,
    }).expect(409);
  });
  it('does not acknowledge a failed database write', async () => {
    const s = await create();
    snapshots.putBatchConfirmed.mockRejectedValueOnce(new Error('database unavailable'));
    await call('patch', `/${s.id}`, {
      revision: 0,
      patch: { nameEn: 'Should not persist' },
    }).expect(500);
    const unchanged = (await call('get', `/${s.id}`).expect(200)).body;
    expect(unchanged.draft.nameEn).toBe('');
    expect(unchanged.revision).toBe(0);
  });
});

describe('Listing input rules', () => {
  it('converts decimal money without rounding or floating-point drift', () => {
    expect(priceMinor('26.04')).toBe(2604);
    expect(priceMinor('0.29')).toBe(29);
    expect(priceMinor('26.041')).toBeNull();
    expect(priceMinor('-1')).toBeNull();
    expect(priceMinor('0')).toBeNull();
  });
  it('does not derive prices from unrelated dimensions or claim parameters', () => {
    expect(guidedPatch('3000x3600px, 200g cotton, make it attractive').price).toBeUndefined();
    expect(guidedPatch('价格：26.045 USD').price).toBeUndefined();
    expect(() => readRasterDataUrl('data:image/png;base64,YWJj')).toThrow();
  });
});
