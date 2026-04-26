import { Inject, Injectable, Logger } from '@nestjs/common';

import type {
  AICapabilityName,
  AIProvider,
  AiCheckRiskInput,
  AiCheckRiskResult,
  AiDesignIdeasInput,
  AiDesignIdeasResult,
  AiGenerateSloganInput,
  AiGenerateSloganResult,
  AiGiftSetInput,
  AiGiftSetResult,
  AiLogoLayoutInput,
  AiLogoLayoutResult,
  AiRemoveBackgroundInput,
  AiRemoveBackgroundResult,
} from '@custom-merch/shared';

import { AIRequestLogRepository } from './ai-request-log.repository';
import { AI_PROVIDER } from './ai.tokens';

@Injectable()
export class AIService {
  private readonly log = new Logger(AIService.name);

  constructor(
    @Inject(AI_PROVIDER) private readonly provider: AIProvider,
    private readonly logs: AIRequestLogRepository,
  ) {}

  generateSlogan(input: AiGenerateSloganInput, userId?: string): Promise<AiGenerateSloganResult> {
    return this.run('generate-slogan', input, () => this.provider.generateSlogan(input), userId);
  }

  designIdeas(input: AiDesignIdeasInput, userId?: string): Promise<AiDesignIdeasResult> {
    return this.run('design-ideas', input, () => this.provider.designIdeas(input), userId);
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
      // never log raw image bytes — keep the payload size sane
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
      // Re-throw so the controller can return a non-200 — the front-end
      // will fall back to manual tools without breaking the flow.
      throw err;
    }
  }
}
