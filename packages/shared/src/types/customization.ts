import type { PrintMethod } from '../constants/print-methods';
import type { DesignStatus } from '../constants/statuses';

import type { Brand, IsoDateString, Timestamps } from './common';
import type { ProductId, ProductPrintAreaId, ProductVariantId } from './product';
import type { OrganizationId, UserId } from './user';

export type CustomizationTemplateId = Brand<string, 'CustomizationTemplateId'>;
export type CustomerDesignId = Brand<string, 'CustomerDesignId'>;

/** Schema version of the {@link DesignJson} payload — bumped when breaking changes ship. */
export const DESIGN_JSON_SCHEMA_VERSION = '1.0' as const;

export interface DesignCanvas {
  /** Width of the design canvas in pixels (logical, 300 DPI scaled in renderer). */
  widthPx: number;
  heightPx: number;
  backgroundColor?: string;
}

interface BaseLayer {
  id: string;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  rotationDegrees: number;
  opacity: number;
  visible: boolean;
  locked?: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  italic?: boolean;
  underline?: boolean;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  letterSpacing?: number;
  lineHeight?: number;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  /** URL of the uploaded image (S3 / signed). */
  src: string;
  /** SHA-256 of the source asset, used for deduplication and audit trail. */
  sourceHash?: string;
  filters?: string[];
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shape: 'rectangle' | 'circle' | 'triangle' | 'line';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
}

export type DesignLayer = TextLayer | ImageLayer | ShapeLayer;

/** Per-print-area design state, keyed by {@link ProductPrintArea.key}. */
export interface DesignArea {
  printAreaKey: string;
  printMethod: PrintMethod;
  canvas: DesignCanvas;
  layers: DesignLayer[];
}

/** Serialised, version-stamped representation of a customer design. */
export interface DesignJson {
  schemaVersion: typeof DESIGN_JSON_SCHEMA_VERSION;
  productId: ProductId;
  variantId?: ProductVariantId;
  areas: DesignArea[];
}

/**
 * Pre-built starter design template (admin-curated). Customers can clone a
 * template into a {@link CustomerDesign} as the starting point for their work.
 */
export interface CustomizationTemplate extends Timestamps {
  id: CustomizationTemplateId;
  name: string;
  description?: string;
  productId: ProductId;
  /** Restrict the template to specific print areas; empty = all. */
  applicablePrintAreaIds: ProductPrintAreaId[];
  /** Public preview image (mockup) shown in the template gallery. */
  previewImageUrl: string;
  /** Default design payload that seeds the customizer when picked. */
  designJson: DesignJson;
  isPublic: boolean;
  /** Optional locale tag for marketing surfaces. */
  tags: string[];
}

/**
 * A design produced or saved by a specific customer (or designer on their behalf).
 * Designs progress through {@link DesignStatus} as they move through review.
 */
export interface CustomerDesign extends Timestamps {
  id: CustomerDesignId;
  ownerUserId: UserId;
  organizationId?: OrganizationId | null;
  productId: ProductId;
  variantId?: ProductVariantId;
  name: string;
  status: DesignStatus;
  designJson: DesignJson;
  /** Mockup rendered server-side for sharing & order line items. */
  previewImageUrl?: string;
  /** Set by reviewer when status === 'rejected'. */
  reviewerNotes?: string;
  reviewedByUserId?: UserId | null;
  reviewedAt?: IsoDateString | null;
}
