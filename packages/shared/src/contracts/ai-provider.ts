/**
 * Adapter contract for AI providers (Doubao, OpenAI, Anthropic, mock).
 *
 * Capabilities are typed as a discriminated union: each variant declares
 * its `kind`, the request payload, and the expected response shape. Apps
 * never depend on a specific provider - they call AIService / AIClient
 * which delegates here.
 */
import type { Locale } from '../constants/locales';
import type { ProductCategory } from '../constants/product-categories';

import type {
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
} from '../types/ai-dto';

export type AICapabilityName =
  | 'generate-slogan'
  | 'design-ideas'
  | 'design-suggestions'
  | 'generate-design-image'
  | 'check-printability'
  | 'gift-set-suggestions'
  | 'logo-layout'
  | 'remove-background'
  | 'check-design-risk';

export interface AIProvider {
  /** Provider identifier surfaced in logs and webhooks. */
  readonly name: 'mock' | 'openai' | 'anthropic' | 'doubao';

  generateSlogan(input: AiGenerateSloganInput): Promise<AiGenerateSloganResult>;
  designIdeas(input: AiDesignIdeasInput): Promise<AiDesignIdeasResult>;
  designSuggestions(input: AiDesignSuggestionsInput): Promise<AiDesignSuggestionsResult>;
  generateDesignImage(input: AiGenerateDesignImageInput): Promise<AiGenerateDesignImageResult>;
  checkPrintability(input: AiCheckPrintabilityInput): Promise<AiCheckPrintabilityResult>;
  giftSetSuggestions(input: AiGiftSetInput): Promise<AiGiftSetResult>;
  logoLayout(input: AiLogoLayoutInput): Promise<AiLogoLayoutResult>;
  removeBackground(input: AiRemoveBackgroundInput): Promise<AiRemoveBackgroundResult>;
  checkDesignRisk(input: AiCheckRiskInput): Promise<AiCheckRiskResult>;
}

/** Used by both providers to weight the suggested categories. */
export type AICategoryHint = ProductCategory;

/** Common locale + tone hint forwarded into prompts. */
export interface AILocaleContext {
  locale: Locale;
}
