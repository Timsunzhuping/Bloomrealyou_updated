import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { SnapshotStore } from '../_lib/snapshot-store';
import { AIService } from '../ai/ai.service';
import { ConfiguredLLMProvider } from '../ai-agents/llm-provider/configured-llm.provider';
import { AppModule } from '../app.module';
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';
import { ListingAIService } from '../product-listing/listing-ai.service';

import { ModelConfigurationService } from './model-config.service';
import { ModelTransport, isPublicModelAddress } from './model-transport.service';

import type { ModelBinding, ModelConfigurationDto } from '@custom-merch/shared';
import type { NestExpressApplication } from '@nestjs/platform-express';

const secret = 'unit-test-not-a-real-api-key';
const profile = {
  name: '测试文本模型',
  kind: 'text',
  provider: 'doubao',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  model: 'text-test-model',
  timeoutMs: 30000,
  enabled: true,
  apiKey: secret,
};

describe('Model configuration', () => {
  let app: NestExpressApplication, token: string, finance: string;
  let settings: ModelConfigurationService;
  const snapshots = {
    loadAll: jest.fn().mockResolvedValue([]),
    loadAllConfirmed: jest.fn().mockResolvedValue([]),
    put: jest.fn(),
    remove: jest.fn(),
    putBatchConfirmed: jest.fn().mockResolvedValue(undefined),
  };
  const audit = { append: jest.fn(), list: jest.fn().mockReturnValue([]) };
  const config = new ConfigService({
    AI_PROVIDER: 'mock',
    AI_AGENT_PROVIDER: 'mock',
    MODEL_CONFIG_ENCRYPTION_KEY: 'a'.repeat(64),
  });
  const transport = new ModelTransport(config);
  const chat = jest.spyOn(transport, 'chat');
  const post = jest.spyOn(transport, 'post');
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SnapshotStore)
      .useValue(snapshots)
      .overrideProvider(ConfigService)
      .useValue(config)
      .overrideProvider(ModelTransport)
      .useValue(transport)
      .overrideProvider(AuditLogsRepository)
      .useValue(audit)
      .compile();
    app = module.createNestApplication<NestExpressApplication>();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    settings = app.get(ModelConfigurationService);
    token = (
      await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({ email: 'admin@bloomrealyou.com', password: 'admin123' })
        .expect(200)
    ).body.token;
    finance = (
      await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({ email: 'finance@bloomrealyou.com', password: 'finance123' })
        .expect(200)
    ).body.token;
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path = '', body?: object) =>
    request(app.getHttpServer())
      [method](`/admin/model-config${path}`)
      .auth(token, { type: 'bearer' })
      .send(body);
  async function create(values = {}) {
    return (
      await call('post', '/profiles', {
        ...profile,
        ...values,
        revision: settings.view().revision,
      }).expect(201)
    ).body as ModelConfigurationDto;
  }
  async function bind(scope: ModelBinding['scope'], id: string | null) {
    const s = settings.view();
    return (
      await call('patch', '/bindings', {
        revision: s.revision,
        bindings: s.bindings.map((b) =>
          b.scope === scope ? { ...b, mode: id ? 'profile' : 'disabled', profileId: id } : b,
        ),
      }).expect(200)
    ).body as ModelConfigurationDto;
  }
  it('requires admin permissions for reads, key changes and tests', async () => {
    await request(app.getHttpServer()).get('/admin/model-config').expect(401);
    await request(app.getHttpServer())
      .get('/admin/model-config')
      .auth(finance, { type: 'bearer' })
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/model-config/profiles')
      .auth(finance, { type: 'bearer' })
      .send(profile)
      .expect(401);
    await request(app.getHttpServer())
      .post('/admin/model-config/profiles/fake/test')
      .auth(finance, { type: 'bearer' })
      .expect(401);
  });
  it('encrypts keys at rest and never returns or audits plaintext/ciphertext', async () => {
    const s = await create();
    const p = s.profiles[0]!;
    expect(p.hasKey).toBe(true);
    expect(p.keyStatus).toBe('ready');
    expect(JSON.stringify(s)).not.toContain(secret);
    expect(JSON.stringify(s)).not.toContain('encryptedKey');
    const rows = snapshots.putBatchConfirmed.mock.calls.at(-1)![0];
    expect(rows[0].data.profiles[0].encryptedKey).toMatch(/^v1\./);
    expect(JSON.stringify(rows)).not.toContain(secret);
    expect(JSON.stringify(audit.append.mock.calls)).not.toContain(secret);
    await bind('listing-text', p.id);
    expect(settings.resolve('listing-text')?.apiKey).toBe(secret);
  });
  it('preserves omitted keys, rejects stale updates and endpoint key transfer', async () => {
    const p = settings.view().profiles[0]!;
    const { apiKey: _key, ...values } = profile;
    const s = await call('patch', `/profiles/${p.id}`, {
      ...values,
      revision: settings.view().revision,
      model: 'updated-text-model',
    }).expect(200);
    expect(s.body.profiles[0].hasKey).toBe(true);
    await call('patch', `/profiles/${p.id}`, { ...values, revision: 0 }).expect(409);
    await call('patch', `/profiles/${p.id}`, {
      ...values,
      revision: settings.view().revision,
      baseUrl: 'https://api.openai.com/v1',
    }).expect(400);
    expect(settings.resolve('listing-text')?.model).toBe('updated-text-model');
  });
  it('blocks unsafe endpoints, invalid profiles and mismatched application types', async () => {
    for (const baseUrl of [
      'http://api.openai.com/v1',
      'https://127.0.0.1/v1',
      'https://api.openai.com.evil.test/v1',
      'https://user:secret@api.openai.com/v1',
      'https://api.openai.com/v1?token=secret',
    ])
      await call('post', '/profiles', {
        ...profile,
        revision: settings.view().revision,
        baseUrl,
      }).expect(400);
    await call('post', '/profiles', {
      ...profile,
      revision: settings.view().revision,
      kind: 'image',
      provider: 'anthropic',
    }).expect(400);
    await call('post', '/profiles', {
      ...profile,
      revision: settings.view().revision,
      apiKey: null,
    }).expect(400);
    const s = settings.view();
    await call('patch', '/bindings', {
      revision: s.revision,
      bindings: s.bindings.map((b) =>
        b.scope === 'design-image' ? { ...b, mode: 'profile', profileId: s.profiles[0]!.id } : b,
      ),
    }).expect(400);
  });
  it('does not acknowledge database failure or alter runtime configuration', async () => {
    const s = settings.view();
    snapshots.putBatchConfirmed.mockRejectedValueOnce(new Error('database unavailable'));
    await call('post', '/profiles', {
      ...profile,
      revision: s.revision,
      name: 'Must not save',
    }).expect(503);
    expect(settings.view()).toEqual(s);
  });
  it('routes listing extraction, designer text and designer images immediately', async () => {
    const textId = settings.view().profiles[0]!.id;
    await bind('design-text', textId);
    chat.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              patch: { nameEn: 'Cotton Tee' },
              evidence: { nameEn: '棉质T恤' },
            }),
          },
        },
      ],
    });
    expect((await app.get(ListingAIService).extract('名称：棉质T恤'))?.nameEn).toBe('Cotton Tee');
    expect(chat.mock.calls.at(-1)![0].model).toBe('updated-text-model');
    chat.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({ suggestions: [{ title: 'Example' }], source: 'doubao' }),
          },
        },
      ],
    });
    await app.get(AIService).designSuggestions({ scene: 'A cotton tee design', locale: 'en' });
    expect(chat.mock.calls.at(-1)![0].id).toBe(textId);
    const next = await create({
      name: '测试生图模型',
      kind: 'image',
      model: 'image-test-model',
      timeoutMs: 120000,
    });
    const imageId = next.profiles.at(-1)!.id;
    await bind('design-image', imageId);
    post.mockResolvedValueOnce({
      data: [
        {
          b64_json:
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lWQAAAAASUVORK5CYII=',
        },
      ],
    });
    const generated = await app
      .get(AIService)
      .generateDesignImage({ prompt: 'A flower illustration' });
    expect(generated.model).toBe('image-test-model');
    expect(post.mock.calls.at(-1)![0].id).toBe(imageId);
    await bind('design-image', null);
    await expect(app.get(AIService).generateDesignImage({ prompt: 'test' })).rejects.toThrow();
  });
  it('tests the configured model and returns safe failure instead of upstream details', async () => {
    chat.mockResolvedValueOnce({ choices: [{ message: { content: 'OK' } }] });
    const id = settings.view().profiles[0]!.id;
    const good = await call('post', `/profiles/${id}/test`).expect(201);
    expect(good.body.ok).toBe(true);
    chat.mockRejectedValueOnce(new Error(`upstream contains ${secret}`));
    const bad = await call('post', `/profiles/${id}/test`).expect(201);
    expect(bad.body.ok).toBe(false);
    expect(JSON.stringify(bad.body)).not.toContain(secret);
  });
  it('keeps bound profiles from deletion, then permits unassigning and removing the key', async () => {
    const p = settings.view().profiles[0]!;
    await call('delete', `/profiles/${p.id}`, { revision: settings.view().revision }).expect(409);
    await bind('listing-text', null);
    await bind('design-text', null);
    const { apiKey: _key, ...values } = profile;
    await call('patch', `/profiles/${p.id}`, {
      ...values,
      revision: settings.view().revision,
      removeKey: true,
      enabled: false,
    }).expect(200);
    expect(settings.view().profiles[0]?.hasKey).toBe(false);
    await call('delete', `/profiles/${p.id}`, { revision: settings.view().revision }).expect(200);
  });
  it('detects a missing encryption key and corrupted stored credentials', async () => {
    const stored = snapshots.putBatchConfirmed.mock.calls.find(
      (c) => c[0][0].data.profiles[0]?.encryptedKey,
    )?.[0][0].data;
    const broken = new ModelConfigurationService(
      {
        ...snapshots,
        loadAllConfirmed: jest.fn().mockResolvedValue([{ entityId: 'platform', data: stored }]),
      } as unknown as SnapshotStore,
      new ConfigService({ MODEL_CONFIG_ENCRYPTION_KEY: 'b'.repeat(64) }),
      transport,
      audit as unknown as AuditLogsRepository,
    );
    await broken.onModuleInit();
    expect(broken.view().profiles[0]?.keyStatus).toBe('locked');
    const missing = new ModelConfigurationService(
      snapshots as unknown as SnapshotStore,
      new ConfigService(),
      transport,
      audit as unknown as AuditLogsRepository,
    );
    await expect(
      missing.saveProfile(null, { ...profile, kind: 'text', provider: 'doubao', revision: 0 }, {
        id: 'admin',
      } as never),
    ).rejects.toMatchObject({ status: 503 });
  });
  it('restores encrypted configuration and counts failed tests toward the daily limit', async () => {
    const stored = structuredClone(
      snapshots.putBatchConfirmed.mock.calls.find(
        (c) =>
          c[0][0].data.profiles[0]?.encryptedKey &&
          c[0][0].data.bindings.some(
            (b: ModelBinding) => b.scope === 'listing-text' && b.mode === 'profile',
          ),
      )![0][0].data,
    );
    const restored = new ModelConfigurationService(
      {
        ...snapshots,
        loadAllConfirmed: jest.fn().mockResolvedValue([{ entityId: 'platform', data: stored }]),
      } as unknown as SnapshotStore,
      config,
      transport,
      audit as unknown as AuditLogsRepository,
    );
    await restored.onModuleInit();
    expect(restored.resolve('listing-text')?.apiKey).toBe(secret);
    const actor = { id: 'quota-test-admin', role: 'admin' } as never;
    for (let i = 0; i < 10; i++) {
      chat.mockRejectedValueOnce(new Error('safe test failure'));
      expect((await restored.test(stored.profiles[0].id, actor)).ok).toBe(false);
    }
    await expect(restored.test(stored.profiles[0].id, actor)).rejects.toMatchObject({
      status: 429,
      response: { code: 'MODEL_TEST_LIMIT' },
    });
  });
  it('fails closed if persisted settings cannot be loaded', async () => {
    const unavailable = new ModelConfigurationService(
      {
        ...snapshots,
        loadAllConfirmed: jest.fn().mockRejectedValue(new Error('unavailable')),
      } as unknown as SnapshotStore,
      config,
      transport,
      audit as unknown as AuditLogsRepository,
    );
    await unavailable.onModuleInit();
    expect(() => unavailable.view()).toThrow('模型配置存储不可用，请恢复数据库后重启 API。');
    expect(() => unavailable.resolve('assistant')).toThrow();
  });
  it('routes assistant requests through the selected SDK endpoint without exposing its key', async () => {
    const s = await create({
      name: '助手',
      provider: 'openai-compatible',
      baseUrl: 'https://api.openai.com/v1',
      model: 'assistant-test-model',
    });
    await bind('assistant', s.profiles.at(-1)!.id);
    const fetchMock = jest.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Hello', tool_calls: [] } }],
          usage: { prompt_tokens: 1, completion_tokens: 1 },
        }),
        { headers: { 'content-type': 'application/json' } },
      ),
    );
    jest.spyOn(transport, 'sdkFetch').mockReturnValueOnce(fetchMock);
    expect(
      (await app.get(ConfiguredLLMProvider).generateResponse([], [], 'Be helpful')).content,
    ).toBe('Hello');
    expect(String(fetchMock.mock.calls[0]![0])).toBe('https://api.openai.com/v1/chat/completions');
  });
});
describe('Model endpoint address policy', () => {
  it('rejects local, cloud metadata, shared, documentation and mapped addresses', () => {
    for (const ip of [
      '127.0.0.1',
      '10.0.0.1',
      '169.254.169.254',
      '100.64.0.1',
      '192.168.0.1',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
      'fe80::1',
      '2001:db8::1',
    ])
      expect(isPublicModelAddress(ip)).toBe(false);
    expect(isPublicModelAddress('1.1.1.1')).toBe(true);
    expect(isPublicModelAddress('2606:4700::1111')).toBe(true);
  });
});
