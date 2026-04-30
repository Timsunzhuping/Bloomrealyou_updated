/**
 * Wire-format DTOs for the AI capabilities. Both NestJS controllers and the
 * SDK reference these shapes so server / client stay aligned.
 */
import type { Locale } from '../constants/locales';
import type { ProductCategory } from '../constants/product-categories';

/** Maximum prompt length accepted by every AI endpoint. */
export const AI_PROMPT_MAX_LENGTH = 1000;
/** Maximum data-URL bytes (≈ 5MB raw) for the remove-background mock. */
export const AI_IMAGE_MAX_BYTES = 6_500_000;

// ── generate-slogan ────────────────────────────────────────────────────

export type SloganTone = 'professional' | 'playful' | 'inspirational' | 'bold' | 'friendly';

export interface AiGenerateSloganInput {
  /** Free-form prompt (e.g. "Tech conference in Dubai for a fintech startup"). */
  prompt: string;
  /** Output locale. Defaults to the request locale. */
  locale?: Locale;
  /** Optional tone hint. */
  tone?: SloganTone;
  /** Number of candidates to return (1..6). Default 4. */
  count?: number;
}

export interface SloganSuggestion {
  text: string;
  tone: SloganTone;
  language: Locale;
}

export interface AiGenerateSloganResult {
  slogans: SloganSuggestion[];
}

// ── design-ideas ────────────────────────────────────────────────────────

export interface AiDesignIdeasInput {
  prompt: string;
  locale?: Locale;
  /** Optional categories the customer is leaning toward. */
  preferredCategories?: ProductCategory[];
}

export interface DesignIdea {
  title: string;
  style: string;
  /** 3–6 hex colour codes. */
  colors: string[];
  layoutSuggestion: string;
  recommendedProducts: ProductCategory[];
}

export interface AiDesignIdeasResult {
  ideas: DesignIdea[];
}

// ── gift-set-suggestions ────────────────────────────────────────────────

export interface AiGiftSetInput {
  /** Scenario / occasion (e.g. "Holiday gift for engineering team of 80"). */
  prompt: string;
  locale?: Locale;
  /** Approximate per-recipient budget in USD (optional). */
  budgetUsd?: number;
  audienceSize?: number;
}

export interface GiftSet {
  name: string;
  products: ProductCategory[];
  reason: string;
}

export interface AiGiftSetResult {
  sets: GiftSet[];
}

// ── logo-layout ─────────────────────────────────────────────────────────

export interface AiLogoLayoutInput {
  /** Brand or product context. */
  prompt: string;
  locale?: Locale;
  /** Print area key (e.g. "front", "left_sleeve"). */
  printArea?: string;
}

/** Lightweight layout descriptor — the customizer can map this to layers. */
export interface LogoLayoutObject {
  type: 'text' | 'logo' | 'shape';
  /** Relative position in the print area (0..1). */
  x: number;
  y: number;
  /** Relative size (0..1). */
  width: number;
  height: number;
  /** Optional reference content for text objects. */
  content?: string;
}

export interface LogoLayout {
  name: string;
  description: string;
  objects: LogoLayoutObject[];
}

export interface AiLogoLayoutResult {
  layouts: LogoLayout[];
}

// ── remove-background ───────────────────────────────────────────────────

export interface AiRemoveBackgroundInput {
  /** Source image as a data URL (PNG / JPG). */
  imageDataUrl: string;
}

export interface AiRemoveBackgroundResult {
  /** Output image data URL (mocked: identity in dev, real model in prod). */
  imageDataUrl: string;
  /** Indicates whether real background removal ran or the input was passed through. */
  mode: 'real' | 'mock';
}

// ── check-design-risk ───────────────────────────────────────────────────

export interface AiCheckRiskInput {
  /** Design JSON (customizer snapshot). */
  designJson: Record<string, unknown>;
  /** Optional textual context. */
  prompt?: string;
}

export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskFinding {
  level: RiskLevel;
  /** Stable code, e.g. `trademark_match`, `low_contrast`. */
  code: string;
  /** Default English message. Front-end may localize by `code`. */
  message: string;
  /** Optional reference to a layer id when relevant. */
  objectId?: string;
}

export interface AiCheckRiskResult {
  overall: RiskLevel;
  findings: RiskFinding[];
}
