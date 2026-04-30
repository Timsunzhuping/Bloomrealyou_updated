import { Injectable } from '@nestjs/common';

import type {
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
  Locale,
  ProductCategory,
  RiskFinding,
  SloganTone,
} from '@custom-merch/shared';

const TONES: SloganTone[] = ['professional', 'playful', 'inspirational', 'bold', 'friendly'];

/**
 * Deterministic mock provider used in dev / CI / when OPENAI_API_KEY is
 * absent. Structured outputs match the contract exactly; copy is intentionally
 * generic so it never resembles real-world brand IP.
 */
@Injectable()
export class MockAIProvider implements AIProvider {
  readonly name = 'mock' as const;

  async generateSlogan(input: AiGenerateSloganInput): Promise<AiGenerateSloganResult> {
    const locale = input.locale ?? 'en';
    const count = clamp(input.count ?? 4, 1, 6);
    const promptKeyword = pickKeyword(input.prompt) ?? topic(locale);
    const slogans = Array.from({ length: count }, (_, i) => ({
      text: composeSlogan(promptKeyword, locale, input.tone ?? TONES[i % TONES.length]!),
      tone: input.tone ?? TONES[i % TONES.length]!,
      language: locale,
    }));
    return { slogans };
  }

  async designIdeas(input: AiDesignIdeasInput): Promise<AiDesignIdeasResult> {
    const focus = pickKeyword(input.prompt) ?? 'event';
    const products: ProductCategory[] = input.preferredCategories?.length
      ? input.preferredCategories.slice(0, 3)
      : ['t-shirts', 'mugs', 'stickers'];
    return {
      ideas: [
        {
          title: `Minimalist ${focus} kit`,
          style: 'Clean, sans-serif typography with generous whitespace.',
          colors: ['#0F172A', '#F97316', '#FFFFFF'],
          layoutSuggestion: 'Centred wordmark with a subtle accent stripe along the chest.',
          recommendedProducts: products,
        },
        {
          title: `Bold gradient ${focus} pack`,
          style: 'Vibrant gradient backgrounds with chunky display fonts.',
          colors: ['#7C3AED', '#EC4899', '#0EA5E9'],
          layoutSuggestion: 'Wrap a slogan around the print area in a circular curve.',
          recommendedProducts: products,
        },
        {
          title: `Retro stamp ${focus} edition`,
          style: 'Distressed monochrome stamp with an outer ring.',
          colors: ['#111827', '#FBBF24'],
          layoutSuggestion: 'Stamp logo top-centre, year mark beneath.',
          recommendedProducts: products,
        },
      ],
    };
  }

  async giftSetSuggestions(input: AiGiftSetInput): Promise<AiGiftSetResult> {
    const focus = pickKeyword(input.prompt) ?? 'team';
    return {
      sets: [
        {
          name: `${capitalize(focus)} starter kit`,
          products: ['t-shirts', 'mugs', 'stickers'],
          reason: 'Daily-use essentials that keep the brand visible at the desk and on the go.',
        },
        {
          name: `${capitalize(focus)} field bundle`,
          products: ['hoodies', 'tote-bags', 'hats'],
          reason: 'Outdoor-ready combo for offsites, conferences and field events.',
        },
        {
          name: `${capitalize(focus)} premium pack`,
          products: ['hoodies', 'mugs', 'stickers', 'tote-bags'],
          reason: 'High-perceived-value pack ideal for executive gifting and onboarding.',
        },
      ],
    };
  }

  async logoLayout(_input: AiLogoLayoutInput): Promise<AiLogoLayoutResult> {
    return {
      layouts: [
        {
          name: 'Centred logo',
          description: 'Logo in the centre of the print area, full bleed.',
          objects: [
            { type: 'logo', x: 0.25, y: 0.30, width: 0.5, height: 0.4 },
          ],
        },
        {
          name: 'Logo + tagline',
          description: 'Logo top-centre with a tagline directly underneath.',
          objects: [
            { type: 'logo', x: 0.25, y: 0.18, width: 0.5, height: 0.34 },
            { type: 'text', x: 0.10, y: 0.58, width: 0.8, height: 0.12, content: 'Your tagline' },
          ],
        },
        {
          name: 'Pocket mark',
          description: 'Small logo at the chest pocket position.',
          objects: [
            { type: 'logo', x: 0.65, y: 0.10, width: 0.18, height: 0.18 },
          ],
        },
      ],
    };
  }

  async removeBackground(input: AiRemoveBackgroundInput): Promise<AiRemoveBackgroundResult> {
    return { imageDataUrl: input.imageDataUrl, mode: 'mock' };
  }

  async checkDesignRisk(input: AiCheckRiskInput): Promise<AiCheckRiskResult> {
    const findings: RiskFinding[] = [];
    const layers = pickLayers(input.designJson);
    const text = layers
      .filter((l) => l.type === 'text' && typeof l.text === 'string')
      .map((l) => (l.text as string).toLowerCase())
      .join(' ');

    if (/\bnike|adidas|coca[- ]?cola|disney|apple\b/.test(text)) {
      findings.push({
        level: 'high',
        code: 'trademark_match',
        message: 'Text appears to reference a registered trademark.',
      });
    }
    if (/\b(damn|shit|fuck)\b/.test(text)) {
      findings.push({
        level: 'medium',
        code: 'profanity',
        message: 'Profanity detected — confirm intent.',
      });
    }
    for (const layer of layers) {
      if (layer.type === 'image' && typeof layer.naturalWidth === 'number' && layer.naturalWidth < 600) {
        findings.push({
          level: 'medium',
          code: 'image_low_resolution',
          message: 'Image source is below 600px wide; consider a higher-resolution upload.',
          objectId: layer.id as string | undefined,
        });
      }
    }

    const overall: 'low' | 'medium' | 'high' = findings.some((f) => f.level === 'high')
      ? 'high'
      : findings.some((f) => f.level === 'medium')
        ? 'medium'
        : 'low';
    return { overall, findings };
  }
}

// ── helpers ─────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, Math.floor(n)));
}

function pickKeyword(prompt: string | undefined): string | undefined {
  if (!prompt) return undefined;
  const cleaned = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w));
  return cleaned[0];
}

function topic(locale: Locale): string {
  switch (locale) {
    case 'zh-CN':
      return '团队';
    case 'es':
      return 'equipo';
    case 'ar':
      return 'فريق';
    default:
      return 'team';
  }
}

function capitalize(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
}

function composeSlogan(keyword: string, locale: Locale, tone: SloganTone): string {
  const stem = capitalize(keyword);
  switch (locale) {
    case 'zh-CN':
      return `${stem} · ${toneSuffixZh(tone)}`;
    case 'es':
      return `${stem} ${toneSuffixEs(tone)}`;
    case 'ar':
      return `${stem} — ${toneSuffixAr(tone)}`;
    default:
      return `${stem} ${toneSuffixEn(tone)}`;
  }
}

function toneSuffixEn(tone: SloganTone): string {
  switch (tone) {
    case 'playful': return 'made easy';
    case 'inspirational': return 'reimagined';
    case 'bold': return 'unleashed';
    case 'friendly': return 'with you';
    default: return 'delivered';
  }
}
function toneSuffixZh(tone: SloganTone): string {
  switch (tone) {
    case 'playful': return '玩得开心';
    case 'inspirational': return '激发可能';
    case 'bold': return '大胆出发';
    case 'friendly': return '一直陪伴';
    default: return '专业可靠';
  }
}
function toneSuffixEs(tone: SloganTone): string {
  switch (tone) {
    case 'playful': return 'a tu medida';
    case 'inspirational': return 'reinventado';
    case 'bold': return 'sin límites';
    case 'friendly': return 'contigo';
    default: return 'entregado';
  }
}
function toneSuffixAr(tone: SloganTone): string {
  switch (tone) {
    case 'playful': return 'بكل بساطة';
    case 'inspirational': return 'إلهام جديد';
    case 'bold': return 'بلا حدود';
    case 'friendly': return 'بجانبك';
    default: return 'باحترافية';
  }
}

const STOP_WORDS = new Set([
  'with', 'that', 'this', 'have', 'from', 'your', 'about', 'their', 'into',
]);

function pickLayers(designJson: Record<string, unknown>): Array<Record<string, unknown> & { type?: string; text?: unknown; naturalWidth?: unknown; id?: unknown }> {
  const canvas = designJson.canvas as Record<string, unknown> | undefined;
  if (canvas && Array.isArray(canvas.objects)) {
    return canvas.objects as Array<Record<string, unknown>>;
  }
  if (Array.isArray(designJson.layers)) {
    return designJson.layers as Array<Record<string, unknown>>;
  }
  return [];
}
