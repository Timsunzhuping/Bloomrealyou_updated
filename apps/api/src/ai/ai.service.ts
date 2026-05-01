import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';

import type {
  AICapabilityName,
  AIProvider,
  AiCheckPrintabilityInput,
  AiCheckPrintabilityResult,
  AiCheckRiskInput,
  AiCheckRiskResult,
  AiDesignIdeasInput,
  AiDesignIdeasResult,
  AiDesignSuggestionsInput,
  AiDesignSuggestionsResult,
  AiGenerateDesignImageInput,
  AiGenerateDesignImageResult,
  AiGenerateSloganInput,
  AiGenerateSloganResult,
  AiGiftSetInput,
  AiGiftSetResult,
  AiLogoLayoutInput,
  AiLogoLayoutResult,
  AiRemoveBackgroundInput,
  AiRemoveBackgroundResult,
  StorageProvider,
} from '@custom-merch/shared';

import { parseDataUrl } from '../files/files.service';
import { STORAGE_PROVIDER } from '../storage/storage.tokens';
import { AIRequestLogRepository } from './ai-request-log.repository';
import { AI_PROVIDER } from './ai.tokens';

@Injectable()
export class AIService {
  private readonly log = new Logger(AIService.name);
  private readonly imageQuota = new Map<string, { date: string; count: number }>();

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    private readonly logs: AIRequestLogRepository,
    private readonly config: ConfigService,
  ) {}

  generateSlogan(input: AiGenerateSloganInput, userId?: string): Promise<AiGenerateSloganResult> {
    return this.run('generate-slogan', input, () => this.provider.generateSlogan(input), userId);
  }

  designIdeas(input: AiDesignIdeasInput, userId?: string): Promise<AiDesignIdeasResult> {
    return this.run('design-ideas', input, () => this.provider.designIdeas(input), userId);
  }

  designSuggestions(
    input: AiDesignSuggestionsInput,
    userId?: string,
  ): Promise<AiDesignSuggestionsResult> {
    return this.run('design-suggestions', input, () => this.provider.designSuggestions(input), userId);
  }

  generateDesignImage(
    input: AiGenerateDesignImageInput,
    userId?: string,
  ): Promise<AiGenerateDesignImageResult> {
    return this.run(
      'generate-design-image',
      input,
      async () => {
        if (this.provider.name === 'mock') {
          throw apiError('AI_PROVIDER_NOT_CONFIGURED', 'AI image generation provider is not configured.');
        }
        if (this.storage.name === 'in-memory' && process.env.NODE_ENV === 'production') {
          throw apiError('AI_STORAGE_NOT_CONFIGURED', 'Persistent AI image storage is not configured.');
        }
        this.assertDailyLimit(userId);
        const generated = await this.provider.generateDesignImage({
          ...input,
          size: input.size ?? '2048x2048',
          transparentBackground: input.transparentBackground ?? true,
        });
        return this.persistGeneratedImage(generated);
      },
      userId,
    );
  }

  checkPrintability(
    input: AiCheckPrintabilityInput,
    userId?: string,
  ): Promise<AiCheckPrintabilityResult> {
    return this.run('check-printability', input, () => this.provider.checkPrintability(input), userId);
  }

  giftSet(input: AiGiftSetInput, userId?: string): Promise<AiGiftSetResult> {
    return this.run(
      'gift-set-suggestions',
      input,
      () => this.provider.giftSetSuggestions(input),
      userId,
    );
  }

  logoLayout(input: AiLogoLayoutInput, userId?: string): Promise<AiLogoLayoutResult> {
    return this.run('logo-layout', input, () => this.provider.logoLayout(input), userId);
  }

  removeBackground(
    input: AiRemoveBackgroundInput,
    userId?: string,
  ): Promise<AiRemoveBackgroundResult> {
    return this.run(
      'remove-background',
      // never log raw image bytes - keep the payload size sane
      { imageDataUrl: '<omitted>' },
      () => this.provider.removeBackground(input),
      userId,
    );
  }

  checkRisk(input: AiCheckRiskInput, userId?: string): Promise<AiCheckRiskResult> {
    return this.run('check-design-risk', input, () => this.provider.checkDesignRisk(input), userId);
  }

  private async run<T>(
    type: AICapabilityName,
    rawInput: unknown,
    fn: () => Promise<T>,
    userId?: string,
  ): Promise<T> {
    const input = rawInput as Record<string, unknown>;
    const started = Date.now();
    try {
      const output = (await fn()) as unknown as Record<string, unknown>;
      this.logs.record({
        userId: userId ?? null,
        provider: this.provider.name,
        requestType: type,
        input,
        output,
        status: 'success',
        errorMessage: null,
        latencyMs: Date.now() - started,
      });
      return output as unknown as T;
    } catch (err) {
      const message = (err as Error).message ?? 'unknown';
      this.log.warn(`AI ${type} failed: ${message}`);
      this.logs.record({
        userId: userId ?? null,
        provider: this.provider.name,
        requestType: type,
        input,
        output: null,
        status: 'failed',
        errorMessage: message,
        latencyMs: Date.now() - started,
      });
      throw err;
    }
  }

  private assertDailyLimit(userId?: string): void {
    const limit = Number(this.config.get<string>('AI_GENERATION_DAILY_LIMIT') ?? '20');
    if (!Number.isFinite(limit) || limit <= 0) return;
    const key = userId || 'anonymous';
    const today = new Date().toISOString().slice(0, 10);
    const current = this.imageQuota.get(key);
    const next = current?.date === today ? current : { date: today, count: 0 };
    if (next.count >= limit) {
      throw apiError('AI_DAILY_LIMIT_REACHED', 'AI image generation daily limit reached.');
    }
    next.count += 1;
    this.imageQuota.set(key, next);
  }

  private async persistGeneratedImage(
    generated: AiGenerateDesignImageResult,
  ): Promise<AiGenerateDesignImageResult> {
    const source = await loadImageBytes(generated.imageUrl);
    const ext = extensionFromContentType(source.contentType);
    const result = await this.storage.putObject({
      key: `ai-designs/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`,
      body: source.buffer,
      contentType: source.contentType,
      cacheControl: 'public, max-age=31536000, immutable',
      metadata: {
        provider: generated.provider,
        model: generated.model ?? '',
      },
    });
    return { ...generated, imageUrl: result.url };
  }
}

function apiError(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

async function loadImageBytes(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (url.startsWith('data:')) {
    const parsed = parseDataUrl(url);
    if (!parsed) throw apiError('AI_IMAGE_DOWNLOAD_FAILED', 'Generated image data URL is invalid.');
    return { buffer: parsed.buffer, contentType: parsed.mime };
  }
  const res = await fetch(url);
  if (!res.ok) throw apiError('AI_IMAGE_DOWNLOAD_FAILED', 'Could not download generated image.');
  const contentType = res.headers.get('content-type')?.split(';')[0] ?? 'image/png';
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, contentType };
}

function extensionFromContentType(contentType: string): string {
  switch (contentType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/svg+xml':
      return 'svg';
    default:
      return 'png';
  }
}
