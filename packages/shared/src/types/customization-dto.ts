/**
 * Wire-format DTOs for the customizations API. The web customizer and the
 * NestJS controllers both import this type so request/response contracts stay
 * identical — schema drifts get caught at typecheck time.
 */
import type { DesignStatus } from '../constants/statuses';

import type { ValidationResult } from './customization-validation';

/** Snapshot of a saved design returned by the API. */
export interface CustomerDesignDto {
  id: string;
  ownerUserId: string;
  organizationId?: string | null;
  productId: string;
  variantId?: string | null;
  templateId?: string | null;
  name: string;
  status: DesignStatus;
  /** Schema-versioned JSON payload from the customizer. */
  designJson: Record<string, unknown>;
  previewImageUrl?: string | null;
  productionFileUrl?: string | null;
  /** Cached output of the most recent /validate run. */
  validationResult?: ValidationResult | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

/** Body for POST /customizations. */
export interface CreateCustomerDesignInput {
  productId: string;
  variantId?: string | null;
  templateId?: string | null;
  name?: string;
  designJson: Record<string, unknown>;
  /** Optional preview captured client-side (data URL, base64-encoded PNG). */
  previewDataUrl?: string;
  /** Optional ownership context — defaults to the demo user when omitted. */
  ownerUserId?: string;
  organizationId?: string | null;
}

/** Body for PATCH /customizations/:id. */
export interface UpdateCustomerDesignInput {
  name?: string;
  status?: DesignStatus;
  designJson?: Record<string, unknown>;
  previewDataUrl?: string;
  reviewerNotes?: string;
}

/** Body for POST /customizations/:id/render-preview. */
export interface RenderPreviewInput {
  /**
   * Client-rendered PNG as a data URL (preferred). When omitted, the API
   * generates a placeholder preview based on the stored designJson.
   */
  previewDataUrl?: string;
}

export interface RenderPreviewResult {
  previewImageUrl: string;
  generatedAt: string;
}

/** Body for POST /customizations/:id/generate-production-file. */
export interface GenerateProductionFileInput {
  /** Output format — multiple may be requested. */
  formats?: Array<'png' | 'svg' | 'pdf' | 'json'>;
  /** High-resolution print-area PNG data URL captured by the browser customizer. */
  productionDataUrl?: string;
}

export interface ProductionArtifact {
  format: 'png' | 'svg' | 'pdf' | 'json';
  url: string;
  /** Bytes uploaded. */
  size: number;
}

export interface GenerateProductionFileResult {
  artifacts: ProductionArtifact[];
  /** Convenience: first PNG artefact when one was produced. */
  productionFileUrl?: string;
  generatedAt: string;
}

/** Body for POST /customizations/:id/validate (no payload — reads from server state). */
export interface ValidateDesignInput {
  /** When true, validate against the supplied JSON instead of the persisted one. */
  designJson?: Record<string, unknown>;
}
