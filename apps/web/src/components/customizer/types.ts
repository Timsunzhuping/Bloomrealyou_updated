/**
 * Customizer-local types. Mirrors the persistent DesignJson schema in
 * `@custom-merch/shared/types/customization` but keeps only the fields the
 * UI needs for in-memory editing. `toDesignJson()` in the store converts
 * back to the canonical shape for persistence.
 */

export type LayerType = 'text' | 'image';

export interface BaseLayer {
  id: string;
  type: LayerType;
  /** Position relative to the canvas origin (top-left). */
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  /** Image source. Persisted designs should use a data URL so exports survive reloads. */
  src: string;
  /** Original filename — surfaced in the layers/properties panel. */
  filename: string;
  /** Source MIME type, used by production validation/export. */
  mime?: string;
  /** Source pixel dimensions, used to compute DPI warnings. */
  naturalWidth: number;
  naturalHeight: number;
}

export type Layer = TextLayer | ImageLayer;

/** Snapshot of the canvas + layers ready for backend persistence. */
export interface CustomizerDesignSnapshot {
  productId: string;
  productSlug: string;
  variantId: string | null;
  printArea: string;
  printAreaRect: AreaRect;
  safeAreaRect: AreaRect;
  canvas: {
    width: number;
    height: number;
    objects: Layer[];
  };
  metadata: {
    createdWith: 'customizer-v1';
    createdAt: string;
  };
}

/** Geometry of the print + safe area expressed as canvas-local rectangles. */
export interface AreaRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
