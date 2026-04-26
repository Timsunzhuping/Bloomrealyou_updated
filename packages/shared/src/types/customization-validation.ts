/**
 * Output of the print-readiness validation engine. Every issue is keyed by a
 * stable code so the front-end can map to localized copy and hide / surface
 * tools accordingly.
 */

export type ValidationLevel = 'error' | 'warning';

/** Stable validation issue codes — keep these constant; localize via i18n. */
export type ValidationCode =
  | 'design_empty'
  | 'preview_missing'
  | 'object_outside_safe_area'
  | 'object_outside_print_area'
  | 'image_low_resolution'
  | 'image_unsupported_format'
  | 'text_too_small'
  | 'text_empty';

export interface ValidationIssue {
  level: ValidationLevel;
  code: ValidationCode;
  /**
   * Default English message, rendered when the front-end has no localized copy.
   * Always pair this with `code` so callers can localize.
   */
  message: string;
  /** Layer/object id the issue applies to, when relevant. */
  objectId?: string;
  /** Free-form metadata for the front-end (e.g. measured DPI). */
  context?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** Total count of issues regardless of level. */
  total: number;
  /** ISO 8601 timestamp of when validation ran. */
  validatedAt: string;
}
