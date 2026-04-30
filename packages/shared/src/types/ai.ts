import type { Locale } from '../constants/locales';

import type { Brand, IsoDateString, Money, Timestamps } from './common';
import type { UserId } from './user';

export type AIRequestLogId = Brand<string, 'AIRequestLogId'>;

/** Logical AI features supported on the platform. Extend cautiously. */
export type AIFeature =
  | 'slogan_generation'
  | 'design_suggestion'
  | 'logo_layout'
  | 'gift_bundle_recommendation'
  | 'translation';

/** Outcome of an AI provider call. */
export type AIRequestStatus = 'success' | 'failed' | 'rate_limited' | 'timeout';

/**
 * Append-only log of every AI provider call. Used for cost attribution,
 * audit trails, prompt-engineering iteration, and rate-limit analysis.
 */
export interface AIRequestLog extends Timestamps {
  id: AIRequestLogId;
  userId?: UserId | null;
  feature: AIFeature;
  /** Adapter name, e.g. `openai`, `anthropic`, `mock`. */
  provider: string;
  /** Concrete model id, e.g. `claude-opus-4-7`. */
  model?: string;
  locale?: Locale;
  status: AIRequestStatus;
  /** Input prompt + parameters (JSON blob). */
  request: Record<string, unknown>;
  /** Provider response payload (JSON blob). */
  response?: Record<string, unknown>;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  /** Estimated cost; stored alongside the request for fast reporting. */
  cost?: Money;
  latencyMs?: number;
  errorCode?: string;
  errorMessage?: string;
  /** Set on the request originator (request id from API gateway). */
  correlationId?: string;
  /** Set on the entity the request relates to, e.g. `CustomerDesign:abc-123`. */
  entityRef?: string;
  occurredAt: IsoDateString;
}
