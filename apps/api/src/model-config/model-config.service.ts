import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';

import { MODEL_SCOPES } from '@custom-merch/shared';
import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';


import { SnapshotStore } from '../_lib/snapshot-store';
import { AuditLogsRepository } from '../audit-logs/audit-logs.repository';

import { ModelProfileBody } from './model-config.dto';
import { ModelTransport, type RuntimeModel } from './model-transport.service';

import type {
  AdminUserDto,
  ModelBinding,
  ModelConfigurationDto,
  ModelConnectionTestDto,
  ModelProfileDto,
  ModelScope,
} from '@custom-merch/shared';

interface StoredProfile extends Omit<ModelProfileDto, 'hasKey' | 'keyStatus'> {
  encryptedKey: string | null;
}
interface StoredSettings {
  revision: number;
  profiles: StoredProfile[];
  bindings: ModelBinding[];
}
const KIND = 'model_configuration';
const aad = (p: StoredProfile) => Buffer.from(`${p.id}|${p.provider}|${p.baseUrl}`);
const imageScope = (scope: ModelScope) => scope === 'design-image' || scope === 'listing-image';

@Injectable()
export class ModelConfigurationService implements OnModuleInit {
  private state: StoredSettings = {
    revision: 0,
    profiles: [],
    bindings: MODEL_SCOPES.map((scope) => ({ scope, mode: 'environment', profileId: null })),
  };
  private available = true;
  private writing = false;
  private readonly testing = new Set<string>();
  private readonly testQuota = new Map<string, { day: string; count: number }>();
  constructor(
    private readonly snapshots: SnapshotStore,
    private readonly config: ConfigService,
    private readonly transport: ModelTransport,
    private readonly audit: AuditLogsRepository,
  ) {}
  async onModuleInit(): Promise<void> {
    try {
      const rows = await this.snapshots.loadAllConfirmed<StoredSettings>(KIND);
      const stored = rows.find((r) => r.entityId === 'platform')?.data;
      if (stored) this.state = stored;
    } catch {
      this.available = false;
    }
  }
  view(): ModelConfigurationDto {
    this.assertAvailable();
    return {
      revision: this.state.revision,
      profiles: this.state.profiles.map(({ encryptedKey, ...p }) => ({
        ...p,
        hasKey: Boolean(encryptedKey),
        keyStatus: this.keyStatus({ ...p, encryptedKey }),
      })),
      bindings: structuredClone(this.state.bindings),
      runtime: MODEL_SCOPES.map((scope) => {
        try {
          const p = this.resolve(scope);
          return {
            scope,
            provider: p?.provider ?? null,
            model: p?.model ?? null,
            status: p
              ? 'ready'
              : this.binding(scope).mode === 'disabled' || this.binding(scope).mode === 'profile'
                ? 'disabled'
                : 'unconfigured',
          };
        } catch {
          return { scope, provider: null, model: null, status: 'locked' };
        }
      }),
      encryptionReady: Boolean(this.encryptionKey()),
      persistence: process.env.DATABASE_URL ? 'database' : 'memory',
      allowedHosts: this.transport.allowedHosts(),
    };
  }
  async saveProfile(
    id: string | null,
    body: ModelProfileBody,
    actor: AdminUserDto,
  ): Promise<ModelConfigurationDto> {
    return this.mutate(body.revision, actor, 'save-profile', async (next) => {
      const existing = id ? next.profiles.find((p) => p.id === id) : undefined;
      if (id && !existing) throw new BadRequestException('Model not found');
      if (!id && next.profiles.length >= 30) throw new BadRequestException('Model limit reached');
      if (body.kind === 'image' && body.provider !== 'doubao')
        throw new BadRequestException({
          code: 'MODEL_PROTOCOL_UNSUPPORTED',
          message: '当前生图及图片优化仅支持豆包 Seedream 协议。',
        });
      if (!body.name.trim()) throw new BadRequestException('Model name required');
      if (body.removeKey && body.apiKey) throw new BadRequestException('Conflicting key operation');
      const baseUrl = this.transport.validateBaseUrl(body.baseUrl.trim());
      if (
        existing?.encryptedKey &&
        (existing.provider !== body.provider || existing.baseUrl !== baseUrl) &&
        !body.apiKey &&
        !body.removeKey
      )
        throw new BadRequestException({
          code: 'MODEL_KEY_REENTRY_REQUIRED',
          message: '修改服务商或 API 地址后须重新输入 Key。',
        });
      const p: StoredProfile = {
        id: existing?.id ?? randomUUID(),
        name: body.name.trim(),
        provider: body.provider,
        kind: body.kind,
        baseUrl,
        model: body.model,
        timeoutMs: body.timeoutMs,
        enabled: body.enabled,
        encryptedKey: null,
        updatedAt: new Date().toISOString(),
      };
      const secret =
        body.apiKey ?? (!body.removeKey && existing?.encryptedKey ? this.decrypt(existing) : null);
      if (secret) p.encryptedKey = this.encrypt(p, secret);
      if (p.enabled && !p.encryptedKey)
        throw new BadRequestException({
          code: 'MODEL_KEY_REQUIRED',
          message: '启用模型前须配置 Key。',
        });
      for (const b of next.bindings.filter((b) => b.profileId === p.id))
        if (imageScope(b.scope) !== (p.kind === 'image'))
          throw new BadRequestException('Model is assigned to an incompatible application');
      if (existing) next.profiles[next.profiles.indexOf(existing)] = p;
      else next.profiles.push(p);
    });
  }
  removeProfile(id: string, revision: number, actor: AdminUserDto) {
    return this.mutate(revision, actor, 'remove-profile', async (next) => {
      if (next.bindings.some((b) => b.profileId === id))
        throw new ConflictException({
          code: 'MODEL_IN_USE',
          message: '请先解除该模型的应用分配。',
        });
      next.profiles = next.profiles.filter((p) => p.id !== id);
    });
  }
  bind(revision: number, bindings: ModelBinding[], actor: AdminUserDto) {
    return this.mutate(revision, actor, 'bind-models', async (next) => {
      if (
        new Set(bindings.map((b) => b.scope)).size !== MODEL_SCOPES.length ||
        MODEL_SCOPES.some((s) => !bindings.some((b) => b.scope === s))
      )
        throw new BadRequestException('Invalid model applications');
      for (const b of bindings) {
        if (b.mode !== 'profile' && b.profileId)
          throw new BadRequestException('Unexpected model ID');
        if (b.mode === 'profile') {
          const p = next.profiles.find((p) => p.id === b.profileId);
          if (
            !p ||
            !p.enabled ||
            !p.encryptedKey ||
            imageScope(b.scope) !== (p.kind === 'image') ||
            this.keyStatus(p) !== 'ready'
          )
            throw new BadRequestException({
              code: 'MODEL_BINDING_INVALID',
              message: '请选择已启用、Key 可用且类型匹配的模型。',
            });
        }
      }
      next.bindings = bindings.map((b) => ({
        ...b,
        profileId: b.mode === 'profile' ? b.profileId : null,
      }));
    });
  }
  resolve(scope: ModelScope): RuntimeModel | null {
    this.assertAvailable();
    const b = this.binding(scope);
    if (b.mode === 'disabled') return null;
    if (b.mode === 'environment') return this.environment(scope);
    const p = this.state.profiles.find((p) => p.id === b.profileId);
    if (!p?.enabled || !p.encryptedKey) return null;
    return {
      id: p.id,
      provider: p.provider,
      kind: p.kind,
      baseUrl: p.baseUrl,
      model: p.model,
      timeoutMs: p.timeoutMs,
      apiKey: this.decrypt(p),
    };
  }
  async test(id: string, actor: AdminUserDto): Promise<ModelConnectionTestDto> {
    this.assertAvailable();
    const p = this.state.profiles.find((p) => p.id === id);
    if (!p?.encryptedKey) throw new BadRequestException('Model key required');
    if (this.testing.has(id)) throw new ConflictException('Model test already running');
    const day = new Date().toISOString().slice(0, 10);
    const quota =
      this.testQuota.get(actor.id)?.day === day ? this.testQuota.get(actor.id)! : { day, count: 0 };
    if (quota.count >= 10)
      throw new HttpException(
        { code: 'MODEL_TEST_LIMIT', message: '今日连接测试次数已达上限。' },
        429,
      );
    quota.count++;
    this.testQuota.set(actor.id, quota);
    const runtime: RuntimeModel = { ...p, apiKey: this.decrypt(p) };
    this.testing.add(id);
    const start = Date.now();
    let ok = false;
    try {
      const result =
        p.kind === 'text'
          ? await this.transport.chat(runtime, {
              max_tokens: 128,
              messages: [{ role: 'user', content: 'Reply with OK.' }],
            })
          : await this.transport.post(runtime, 'images/generations', {
              model: p.model,
              prompt: 'A plain blue circle on a white background.',
              size: '2048x2048',
              response_format: 'b64_json',
              watermark: true,
              sequential_image_generation: 'disabled',
            });
      ok =
        p.kind === 'text'
          ? Boolean(result.choices?.[0]?.message?.content?.trim())
          : Boolean(result.data?.[0]?.b64_json?.length);
    } catch {
      ok = false;
    } finally {
      this.testing.delete(id);
    }
    this.audit.append({
      actorUserId: actor.id,
      actorRole: actor.role,
      entityType: 'ModelConfiguration',
      entityId: id,
      action: 'update',
      summary: `Connection test ${ok ? 'passed' : 'failed'}`,
      payload: { model: p.model, ok },
    });
    return {
      ok,
      model: p.model,
      kind: p.kind,
      latencyMs: Date.now() - start,
      code: ok ? 'OK' : 'MODEL_TEST_FAILED',
    };
  }
  private binding(scope: ModelScope) {
    return this.state.bindings.find((b) => b.scope === scope)!;
  }
  private encryptionKey(): Buffer | null {
    const key = String(this.config.get('MODEL_CONFIG_ENCRYPTION_KEY') ?? '');
    return /^[a-fA-F0-9]{64}$/.test(key) ? Buffer.from(key, 'hex') : null;
  }
  private encrypt(p: StoredProfile, value: string): string {
    const key = this.encryptionKey();
    if (!key)
      throw new ServiceUnavailableException({
        code: 'MODEL_VAULT_UNAVAILABLE',
        message: '请在 API 服务器配置 MODEL_CONFIG_ENCRYPTION_KEY 后保存密钥。',
      });
    const iv = randomBytes(12),
      cipher = createCipheriv('aes-256-gcm', key, iv);
    cipher.setAAD(aad(p));
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [
      'v1',
      iv.toString('base64'),
      encrypted.toString('base64'),
      cipher.getAuthTag().toString('base64'),
    ].join('.');
  }
  private decrypt(p: StoredProfile): string {
    try {
      const key = this.encryptionKey();
      const [version, iv, data, tag] = (p.encryptedKey ?? '').split('.');
      if (!key || version !== 'v1' || !iv || !data || !tag) throw new Error();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
      decipher.setAAD(aad(p));
      decipher.setAuthTag(Buffer.from(tag, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException({
        code: 'MODEL_KEY_LOCKED',
        message: '密钥不可解密，请恢复服务器加密密钥或重新配置模型 Key。',
      });
    }
  }
  private keyStatus(p: StoredProfile): ModelProfileDto['keyStatus'] {
    if (!p.encryptedKey) return 'missing';
    try {
      this.decrypt(p);
      return 'ready';
    } catch {
      return 'locked';
    }
  }
  private assertAvailable() {
    if (!this.available)
      throw new ServiceUnavailableException({
        code: 'MODEL_CONFIG_UNAVAILABLE',
        message: '模型配置存储不可用，请恢复数据库后重启 API。',
      });
  }
  private async mutate(
    revision: number,
    actor: AdminUserDto,
    operation: string,
    fn: (s: StoredSettings) => Promise<void>,
  ): Promise<ModelConfigurationDto> {
    this.assertAvailable();
    if (this.writing || revision !== this.state.revision)
      throw new ConflictException({
        code: 'MODEL_CONFIG_STALE',
        message: '模型配置已更新，请重新载入后重试。',
      });
    this.writing = true;
    try {
      const next = structuredClone(this.state);
      await fn(next);
      next.revision++;
      try {
        await this.snapshots.putBatchConfirmed([{ kind: KIND, entityId: 'platform', data: next }]);
      } catch {
        throw new ServiceUnavailableException({
          code: 'MODEL_CONFIG_SAVE_FAILED',
          message: '模型配置未保存，请检查数据库后重试。',
        });
      }
      this.state = next;
      this.audit.append({
        actorUserId: actor.id,
        actorRole: actor.role,
        entityType: 'ModelConfiguration',
        entityId: 'platform',
        action: 'update',
        summary: operation,
        payload: { revision: next.revision },
      });
      return this.view();
    } finally {
      this.writing = false;
    }
  }
  private environment(scope: ModelScope): RuntimeModel | null {
    const agent = scope === 'assistant';
    const provider = String(
      this.config.get(agent ? 'AI_AGENT_PROVIDER' : 'AI_PROVIDER') ??
        (agent
          ? 'mock'
          : this.config.get('ARK_API_KEY')
            ? 'doubao'
            : this.config.get('OPENAI_API_KEY')
              ? 'openai'
              : 'mock'),
    );
    if (provider === 'mock') return null;
    const kind = imageScope(scope) ? 'image' : 'text';
    if (kind === 'image' && provider !== 'doubao') return null;
    const vendor =
      provider === 'claude'
        ? 'anthropic'
        : provider === 'doubao'
          ? 'doubao'
          : provider === 'openai'
            ? 'openai-compatible'
            : null;
    if (!vendor) return null;
    const apiKey = String(
      this.config.get(
        vendor === 'doubao'
          ? 'ARK_API_KEY'
          : vendor === 'anthropic'
            ? 'ANTHROPIC_API_KEY'
            : 'OPENAI_API_KEY',
      ) ?? '',
    );
    if (!apiKey) return null;
    const baseUrl = String(
      this.config.get(
        vendor === 'doubao'
          ? 'ARK_BASE_URL'
          : vendor === 'anthropic'
            ? 'ANTHROPIC_BASE_URL'
            : 'OPENAI_BASE_URL',
      ) ??
        (vendor === 'doubao'
          ? 'https://ark.cn-beijing.volces.com/api/v3'
          : vendor === 'anthropic'
            ? 'https://api.anthropic.com/v1'
            : 'https://api.openai.com/v1'),
    );
    const model = String(
      this.config.get(
        vendor === 'doubao'
          ? kind === 'image'
            ? 'DOUBAO_IMAGE_MODEL'
            : 'DOUBAO_TEXT_MODEL'
          : vendor === 'anthropic'
            ? 'ANTHROPIC_MODEL'
            : 'OPENAI_MODEL',
      ) ||
        (vendor === 'doubao'
          ? kind === 'image'
            ? 'doubao-seedream-4-0-250828'
            : 'doubao-seed-1-6-250615'
          : vendor === 'anthropic'
            ? 'claude-3-5-sonnet-20241022'
            : agent
              ? 'gpt-4o'
              : 'gpt-4o-mini'),
    );
    return {
      id: 'environment',
      provider: vendor,
      kind,
      baseUrl,
      model,
      apiKey,
      timeoutMs: kind === 'image' ? 120000 : 30000,
    };
  }
}
