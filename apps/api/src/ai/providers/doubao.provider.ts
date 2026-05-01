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

interface DoubaoOptions {
  apiKey: string;
  /** Defaults to Fireworks/OpenAI-compatible Ark base URL. */
  baseUrl?: string;
  textModel?: string;
  imageModel?: string;
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

@Injectable()
export class DoubaoProvider implements AIProvider {
  readonly name = 'doubao' as const;
  private readonly log = new Logger(DoubaoProvider.name);
  private readonly fallback = new MockAIProvider();
  private readonly baseUrl: string;
  private readonly textModel: string;
  private readonly imageModel: string;

  constructor(private readonly options: DoubaoOptions) {
    this.baseUrl = (options.baseUrl ?? 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/$/, '');
    this.textModel = options.textModel ?? 'doubao-seed-1-6-250615';
    this.imageModel = options.imageModel ?? 'doubao-seedream-4-0-250828';
  }

  async generateSlogan(input: AiGenerateSloganInput): Promise<AiGenerateSloganResult> {
    return this.callOrFallback<AiGenerateSloganResult>(
      [
        {
          role: 'system',
          content:
            'You are a brand copywriter for custom merchandise. Return strict JSON ' +
            'of the shape {"slogans":[{"text":string,"tone":"professional"|"playful"|"inspirational"|"bold"|"friendly","language":string}]}.',
        },
        { role: 'user', content: JSON.stringify(input) },
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
            'You are a print-on-demand designer. Return strict JSON of the shape ' +
            '{"ideas":[{"title":string,"style":string,"colors":[hex],"layoutSuggestion":string,"recommendedProducts":["t-shirts"|"hoodies"|"mugs"|"hats"|"tote-bags"|"stickers"]}]}. Provide 3 ideas.',
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
            'You are a senior merchandise art director. Return strict JSON of the shape ' +
            '{"suggestions":[{"title":string,"slogan":string,"colors":[hex],"layout":string,"prompt":string}],"source":"doubao"}. ' +
            'Return exactly 3 suggestions. Use the user locale for title/slogan/layout. ' +
            'The prompt must be English, print-ready, standalone artwork, transparent background, no garment mockup, no photo, no trademarked brands.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      async () => fallback,
    ).then((result) => ({ ...result, source: result.source === 'fallback' ? 'fallback' : 'doubao' }));
  }

  async generateDesignImage(input: AiGenerateDesignImageInput): Promise<AiGenerateDesignImageResult> {
    const requestedSize = input.size ?? '2048x2048';
    const size = normalizeSeedreamSize(requestedSize);
    const prompt = buildImagePrompt(input.prompt, input.transparentBackground ?? true);
    const res = await fetch(`${this.baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.options.apiKey}`,
      },
      body: JSON.stringify({
        model: this.imageModel,
        prompt,
        size,
        response_format: 'url',
        watermark: false,
      }),
    });
    if (!res.ok) throw new Error(`DOUBAO_IMAGE_${res.status}`);
    const json = (await res.json()) as {
      data?: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
    };
    const first = json.data?.[0];
    const imageUrl = first?.url ?? (first?.b64_json ? `data:image/png;base64,${first.b64_json}` : null);
    if (!imageUrl) throw new Error('DOUBAO_IMAGE_EMPTY');
    const { width, height } = parseSize(size);
    return {
      imageUrl,
      width,
      height,
      prompt: first?.revised_prompt ?? prompt,
      provider: 'doubao-seedream',
      model: this.imageModel,
    };
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
            '{"sets":[{"name":string,"products":["t-shirts"|"hoodies"|"mugs"|"hats"|"tote-bags"|"stickers"],"reason":string}]}.',
        },
        { role: 'user', content: JSON.stringify(input) },
      ],
      () => this.fallback.giftSetSuggestions(input),
    );
  }

  async logoLayout(input: AiLogoLayoutInput): Promise<AiLogoLayoutResult> {
    return this.fallback.logoLayout(input);
  }

  async removeBackground(input: AiRemoveBackgroundInput): Promise<AiRemoveBackgroundResult> {
    return this.fallback.removeBackground(input);
  }

  async checkDesignRisk(input: AiCheckRiskInput): Promise<AiCheckRiskResult> {
    return this.fallback.checkDesignRisk(input);
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
          model: this.textModel,
          messages,
          temperature: 0.7,
        }),
      });
      if (!res.ok) throw new Error(`Doubao ${res.status}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = json.choices?.[0]?.message?.content;
      if (!content) throw new Error('Doubao: empty content');
      return parseJsonObject<T>(content);
    } catch (err) {
      this.log.warn(`Doubao call failed: ${(err as Error).message} - using fallback`);
      return fallback();
    }
  }
}

function buildImagePrompt(prompt: string, transparent: boolean): string {
  const suffix = transparent
    ? ' Transparent background, isolated artwork, no garment mockup, no product photo.'
    : ' Isolated printable artwork, no garment mockup, no product photo.';
  return `${prompt.trim()}${suffix}`.slice(0, 1000);
}

function normalizeSeedreamSize(size: string): string {
  const { width, height } = parseSize(size);
  return width * height < 3_686_400 ? '2048x2048' : `${width}x${height}`;
}

function parseSize(size: string): { width: number; height: number } {
  const [w, h] = size.split('x').map((n) => Number(n));
  return { width: w || 2048, height: h || 2048 };
}

function parseJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim()) as T;
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
    throw new Error('Doubao: invalid JSON content');
  }
}
