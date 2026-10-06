import { lookup } from 'node:dns/promises';
import { request } from 'node:https';
import { BlockList, isIP } from 'node:net';

import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { ModelKind, ModelVendor } from '@custom-merch/shared';

export interface RuntimeModel {
  id: string;
  provider: ModelVendor;
  kind: ModelKind;
  baseUrl: string;
  model: string;
  apiKey: string;
  timeoutMs: number;
}
export interface ModelResponse {
  choices?: Array<{ message?: { content?: string } }>;
  data?: Array<{ b64_json?: string }>;
  content?: Array<{ type: string; text?: string }>;
}
const DEFAULT_HOSTS = [
  'ark.cn-beijing.volces.com',
  'api.openai.com',
  'api.anthropic.com',
  'api.deepseek.com',
  'api.moonshot.cn',
  'dashscope.aliyuncs.com',
];
const blocked = new BlockList();
for (const [ip, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  blocked.addSubnet(ip, prefix, 'ipv4');
blocked.addSubnet('2001:db8::', 32, 'ipv6');
blocked.addSubnet('2001::', 32, 'ipv6');
blocked.addSubnet('2002::', 16, 'ipv6');
const publicV6 = new BlockList();
publicV6.addSubnet('2000::', 3, 'ipv6');
export function isPublicModelAddress(address: string): boolean {
  const family = isIP(address);
  return family === 4
    ? !blocked.check(address, 'ipv4')
    : family === 6 && publicV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6');
}

@Injectable()
export class ModelTransport {
  constructor(private readonly config: ConfigService) {}
  allowedHosts(): string[] {
    return [
      ...new Set([
        ...DEFAULT_HOSTS,
        ...String(this.config.get('MODEL_API_ALLOWED_HOSTS') ?? '')
          .split(',')
          .map((v) => v.trim().toLowerCase())
          .filter(Boolean),
      ]),
    ];
  }
  validateBaseUrl(value: string): string {
    try {
      const url = new URL(value);
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash ||
        !this.allowedHosts().includes(url.hostname) ||
        isIP(url.hostname) ||
        !/^\/[A-Za-z0-9/_-]*$/.test(url.pathname)
      )
        throw new Error();
      return url.toString().replace(/\/$/, '');
    } catch {
      throw new BadRequestException({
        code: 'MODEL_ENDPOINT_INVALID',
        message: 'API 地址须为服务器允许的 HTTPS 域名，不能包含凭据、查询参数或自定义端口。',
      });
    }
  }
  async post(
    profile: RuntimeModel,
    path: string,
    body: Record<string, unknown>,
  ): Promise<ModelResponse> {
    const response = await this.send(profile, path, JSON.stringify(body));
    if (!response.ok)
      throw new ServiceUnavailableException({
        code: 'MODEL_UPSTREAM_FAILED',
        message: '模型请求失败，请检查 Key、模型权限和 API 地址。',
      });
    try {
      return (await response.json()) as ModelResponse;
    } catch {
      throw new ServiceUnavailableException({
        code: 'MODEL_RESPONSE_INVALID',
        message: '模型响应格式无效。',
      });
    }
  }
  async chat(profile: RuntimeModel, body: Record<string, unknown>): Promise<ModelResponse> {
    if (profile.provider !== 'anthropic')
      return this.post(profile, 'chat/completions', {
        max_tokens: 1600,
        ...body,
        model: profile.model,
      });
    const messages = body.messages as Array<{ role: string; content: string }>;
    const result = await this.post(profile, 'messages', {
      model: profile.model,
      max_tokens: body.max_tokens ?? 1600,
      system: messages
        .filter((m) => m.role === 'system')
        .map((m) => m.content)
        .join('\n'),
      messages: messages.filter((m) => m.role !== 'system'),
    });
    return {
      choices: [
        {
          message: {
            content: result.content
              ?.filter((c) => c.type === 'text')
              .map((c) => c.text ?? '')
              .join('\n'),
          },
        },
      ],
    };
  }
  sdkFetch(profile: RuntimeModel): typeof fetch {
    return (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const base = `${this.validateBaseUrl(profile.baseUrl)}/`;
      if (!url.startsWith(base) || init?.method !== 'POST' || typeof init.body !== 'string')
        throw new Error('MODEL_SDK_REQUEST_INVALID');
      return this.send(profile, url.slice(base.length), init.body);
    }) as typeof fetch;
  }
  private async send(profile: RuntimeModel, path: string, body: string): Promise<Response> {
    const base = this.validateBaseUrl(profile.baseUrl);
    if (!['chat/completions', 'images/generations', 'messages'].includes(path))
      throw new Error('MODEL_PATH_INVALID');
    const url = new URL(`${base}/${path}`);
    const started = Date.now();
    // Pin the verified DNS answer to the TLS connection; never follow redirects.
    let addresses;
    let dnsTimer: ReturnType<typeof setTimeout> | undefined;
    try {
      addresses = await Promise.race([
        lookup(url.hostname, { all: true }),
        new Promise<never>((_resolve, reject) => {
          dnsTimer = setTimeout(
            () => reject(new Error('DNS_TIMEOUT')),
            Math.min(profile.timeoutMs, 5000),
          );
        }),
      ]);
    } catch {
      throw new ServiceUnavailableException({
        code: 'MODEL_NETWORK_FAILED',
        message: '模型服务域名解析失败。',
      });
    } finally {
      if (dnsTimer) clearTimeout(dnsTimer);
    }
    if (!addresses.length || addresses.some((a) => !isPublicModelAddress(a.address)))
      throw new ServiceUnavailableException({
        code: 'MODEL_ENDPOINT_BLOCKED',
        message: '模型服务地址被安全策略阻止。',
      });
    const selected = addresses.find((a) => a.family === 4) ?? addresses[0]!;
    return new Promise<Response>((resolve, reject) => {
      const fail = () =>
        reject(
          new ServiceUnavailableException({
            code: 'MODEL_NETWORK_FAILED',
            message: '模型网络请求失败或超时。',
          }),
        );
      const req = request(
        url,
        {
          method: 'POST',
          agent: false,
          family: selected.family,
          signal: AbortSignal.timeout(Math.max(1, profile.timeoutMs - (Date.now() - started))),
          lookup: (_hostname, _options, callback) =>
            callback(null, selected.address, selected.family),
          headers: {
            'content-type': 'application/json',
            'content-length': Buffer.byteLength(body),
            ...(profile.provider === 'anthropic'
              ? { 'x-api-key': profile.apiKey, 'anthropic-version': '2023-06-01' }
              : { authorization: `Bearer ${profile.apiKey}` }),
          },
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (chunk: Buffer) => {
            size += chunk.length;
            if (size > 30 * 1024 * 1024) {
              res.destroy();
              req.destroy();
              fail();
            } else chunks.push(chunk);
          });
          res.on('error', fail);
          res.on('end', () => {
            try {
              const status = res.statusCode ?? 502;
              resolve(
                new Response(
                  [204, 205, 304].includes(status) ? null : Buffer.concat(chunks).toString('utf8'),
                  { status, headers: { 'content-type': 'application/json' } },
                ),
              );
            } catch {
              fail();
            }
          });
        },
      );
      req.on('error', fail);
      req.end(body);
    });
  }
}
