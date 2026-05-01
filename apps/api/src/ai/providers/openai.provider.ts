import { Injectable, Logger } from '@nestjs/common';

import type {
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
} from '@custom-merch/shared';

import { MockAIProvider } from './mock-ai.provider';

interface OpenAIOptions {
  apiKey: string;
  /** Defaults to "gpt-4o-mini". */
  model?: string;
  /** Optional override for non-OpenAI compatible endpoints. */
  baseUrl?: string;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

/**
 * Real OpenAI-compatible provider. Uses fetch + chat completions JSON mode
 * (response_format: json_object) so the model output stays parseable.
 *
 * For each capability, we describe the JSON schema in the system prompt and
 * fall back to MockAIProvider if the network call or parse fails — AI must
 * NEVER block the customizer's main flow.
 */
@Injectable()
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai' as const;
  private readonly log = new Logger(OpenAIProvider.name);
  private readonly fallback = new MockAIProvider();
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private readonly options: OpenAIOptions) {
    this.model = options.model ?? 'gpt-4o-mini';
    this.baseUrl = (options.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  }

  async generateSlogan(input: AiGenerateSloganInput): Promise<AiGenerateSloganResult> {
    return this.callOrFallback<AiGenerateSloganResult>(
      [
        {
          role: 'system',
          content:
            'You are a brand copywriter. Return JSON of the shape ' +
            '{"slogans":[{"text":string,"tone":"professional"|"playful"|"inspirational"|"bold"|"friendly","language":string}]}. ' +
            `Return at most ${input.count ?? 4} slogans.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            prompt: input.prompt,
            locale: input.locale ?? 'en',
            tone: input.tone,
          }),
        },
      ],
      () => this.fallback.generateSlogan(input),
    );
  }

  async designIdeas(input: AiDesignIdeasInput): Promise<AiDesignIdeasResult> {
    return this.callOrFallback<AiDesignIdeasResult>(
      [
        {
          role: 'system',
          content:
            'You are a print-on-demand designer. Return JSON of the shape ' +
            '{"ideas":[{"title":string,"style":string,"colors":[hex],"layoutSuggestion":string,"recommendedProducts":["t-shirts"|"hoodies"|"mugs"|"hats"|"tote-bags"|"stickers"]}]}. ' +
            'Provide 3 ideas.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      () => this.fallback.designIdeas(input),
    );
  }

  async designSuggestions(input: AiDesignSuggestionsInput): Promise<AiDesignSuggestionsResult> {
    const fallback = await this.fallback.designSuggestions(input);
    return this.callOrFallback<AiDesignSuggestionsResult>(
      [
        {
          role: 'system',
          content:
            'You are a print-on-demand art director. Return strict JSON of the shape ' +
            '{"suggestions":[{"title":string,"slogan":string,"colors":[hex],"layout":string,"prompt":string}],"source":"openai"}. ' +
            'Provide exactly 3 suggestions. Prompts must be suitable for printable standalone artwork, with transparent background, no product mockup and no photography.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      async () => fallback,
    ).then((result) => ({ ...result, source: result.source === 'fallback' ? 'fallback' : 'openai' }));
  }

  async generateDesignImage(_input: AiGenerateDesignImageInput): Promise<AiGenerateDesignImageResult> {
    throw new Error('AI_IMAGE_GENERATION_NOT_SUPPORTED');
  }

  async checkPrintability(input: AiCheckPrintabilityInput): Promise<AiCheckPrintabilityResult> {
    return this.fallback.checkPrintability(input);
  }

  async giftSetSuggestions(input: AiGiftSetInput): Promise<AiGiftSetResult> {
    return this.callOrFallback<AiGiftSetResult>(
      [
        {
          role: 'system',
          content:
            'You are a corporate gifting curator. Return JSON of the shape ' +
            '{"sets":[{"name":string,"products":["t-shirts"|"hoodies"|"mugs"|"hats"|"tote-bags"|"stickers"],"reason":string}]}. ' +
            'Provide 2-4 sets.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      () => this.fallback.giftSetSuggestions(input),
    );
  }

  async logoLayout(input: AiLogoLayoutInput): Promise<AiLogoLayoutResult> {
    return this.callOrFallback<AiLogoLayoutResult>(
      [
        {
          role: 'system',
          content:
            'You are a layout designer. Return JSON of the shape ' +
            '{"layouts":[{"name":string,"description":string,"objects":[{"type":"text"|"logo"|"shape","x":0..1,"y":0..1,"width":0..1,"height":0..1,"content"?:string}]}]}. ' +
            'Coordinates are relative to the print area.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      () => this.fallback.logoLayout(input),
    );
  }

  async removeBackground(input: AiRemoveBackgroundInput): Promise<AiRemoveBackgroundResult> {
    // Real background removal needs a vision model + image edit API.
    // The MVP delegates to the mock so the contract stays satisfied.
    return this.fallback.removeBackground(input);
  }

  async checkDesignRisk(input: AiCheckRiskInput): Promise<AiCheckRiskResult> {
    return this.callOrFallback<AiCheckRiskResult>(
      [
        {
          role: 'system',
          content:
            'You are a print-readiness reviewer. Return JSON of the shape ' +
            '{"overall":"low"|"medium"|"high","findings":[{"level":"low"|"medium"|"high","code":string,"message":string,"objectId"?:string}]}. ' +
            'Flag trademark conflicts, profanity, low-resolution images and copyrighted logos.',
        },
        {
          role: 'user',
          content: JSON.stringify({ prompt: input.prompt, designJson: input.designJson }),
        },
      ],
      () => this.fallback.checkDesignRisk(input),
    );
  }

  private async callOrFallback<T>(messages: ChatMessage[], fallback: () => Promise<T>): Promise<T> {
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.options.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`OpenAI ${res.status}`);
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenAI: empty content');
      return JSON.parse(content) as T;
    } catch (err) {
      this.log.warn(`OpenAI call failed: ${(err as Error).message} — using fallback`);
      return fallback();
    }
  }
}
