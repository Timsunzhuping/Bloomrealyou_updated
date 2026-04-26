import type {
  ValidationCode,
  ValidationIssue,
  ValidationLevel,
  ValidationResult,
} from '@custom-merch/shared';

/**
 * Pure validation logic — no Nest dependencies so it can be reused on the
 * client (preview gate) and tested in isolation.
 *
 * The engine inspects a customizer-shaped JSON. It is intentionally lenient
 * about the schema (uses `unknown` shapes) so it can validate both the v1
 * customizer payload and any future versions without immediate breakage.
 */

const SUPPORTED_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/svg+xml']);
const MIN_DPI = 150;
const MIN_TEXT_FONT_SIZE = 12;

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface NormalisedDesign {
  canvas: { width: number; height: number };
  printArea?: Rect;
  safeArea?: Rect;
  layers: Array<Record<string, unknown> & { id?: string; type?: string }>;
  hasPreview: boolean;
}

function pickRect(value: unknown): Rect | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const r = value as Record<string, unknown>;
  if (
    typeof r.x !== 'number' ||
    typeof r.y !== 'number' ||
    typeof r.width !== 'number' ||
    typeof r.height !== 'number'
  ) {
    return undefined;
  }
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function normaliseDesign(designJson: Record<string, unknown>, hasPreview: boolean): NormalisedDesign {
  const canvas = (designJson.canvas as Record<string, unknown> | undefined) ?? {};
  const layers = Array.isArray(canvas.objects)
    ? (canvas.objects as Array<Record<string, unknown>>)
    : Array.isArray(designJson.layers)
      ? (designJson.layers as Array<Record<string, unknown>>)
      : [];

  return {
    canvas: {
      width: typeof canvas.width === 'number' ? canvas.width : 800,
      height: typeof canvas.height === 'number' ? canvas.height : 800,
    },
    printArea: pickRect(designJson.printAreaRect ?? designJson.printArea),
    safeArea: pickRect(designJson.safeAreaRect ?? designJson.safeArea),
    layers,
    hasPreview,
  };
}

function rectContains(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

function pushIssue(
  list: ValidationIssue[],
  level: ValidationLevel,
  code: ValidationCode,
  message: string,
  objectId?: string,
  context?: Record<string, unknown>,
): void {
  list.push({ level, code, message, objectId, context });
}

export interface ValidateInput {
  designJson: Record<string, unknown>;
  /** Whether a preview image has been generated for this design. */
  hasPreview: boolean;
}

export function validateDesign(input: ValidateInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const norm = normaliseDesign(input.designJson, input.hasPreview);

  // 1) Empty design
  if (norm.layers.length === 0) {
    pushIssue(issues, 'error', 'design_empty', 'Design has no layers yet.');
  }

  // 2) Preview missing
  if (!norm.hasPreview) {
    pushIssue(
      issues,
      'warning',
      'preview_missing',
      'Preview image has not been generated for this design.',
    );
  }

  for (const raw of norm.layers) {
    const layer = raw as {
      id?: string;
      type?: string;
      x?: number;
      y?: number;
      width?: number;
      height?: number;
      text?: string;
      fontSize?: number;
      naturalWidth?: number;
      naturalHeight?: number;
      mime?: string;
    };
    const id = layer.id;
    const rect: Rect | undefined =
      typeof layer.x === 'number' &&
      typeof layer.y === 'number' &&
      typeof layer.width === 'number' &&
      typeof layer.height === 'number'
        ? { x: layer.x, y: layer.y, width: layer.width, height: layer.height }
        : undefined;

    // 3) Outside safe / print area
    if (rect && norm.safeArea && !rectContains(norm.safeArea, rect)) {
      pushIssue(
        issues,
        'warning',
        'object_outside_safe_area',
        'Layer extends past the safe area — it may be trimmed in production.',
        id,
      );
    }
    if (rect && norm.printArea && !rectContains(norm.printArea, rect)) {
      pushIssue(
        issues,
        'error',
        'object_outside_print_area',
        'Layer is outside the printable area.',
        id,
      );
    }

    if (layer.type === 'text') {
      // 4a) Empty text
      if (typeof layer.text !== 'string' || layer.text.trim().length === 0) {
        pushIssue(issues, 'error', 'text_empty', 'Text layer has no content.', id);
      }
      // 4b) Tiny text
      if (typeof layer.fontSize === 'number' && layer.fontSize < MIN_TEXT_FONT_SIZE) {
        pushIssue(
          issues,
          'warning',
          'text_too_small',
          `Text smaller than ${MIN_TEXT_FONT_SIZE}px may be hard to read.`,
          id,
          { fontSize: layer.fontSize },
        );
      }
    }

    if (layer.type === 'image') {
      // 5a) Unsupported mime
      if (typeof layer.mime === 'string' && !SUPPORTED_IMAGE_MIMES.has(layer.mime)) {
        pushIssue(
          issues,
          'error',
          'image_unsupported_format',
          `Image format ${layer.mime} is not supported for production.`,
          id,
          { mime: layer.mime },
        );
      }
      // 5b) Low resolution check (approximate — canvas px ~ 96 dpi)
      if (
        rect &&
        typeof layer.naturalWidth === 'number' &&
        layer.naturalWidth > 0 &&
        rect.width > 0
      ) {
        const renderedInches = rect.width / 96;
        if (renderedInches > 0) {
          const dpi = layer.naturalWidth / renderedInches;
          if (dpi < MIN_DPI) {
            pushIssue(
              issues,
              'warning',
              'image_low_resolution',
              `Image resolution ${Math.round(dpi)} DPI is below the recommended ${MIN_DPI} DPI.`,
              id,
              { effectiveDpi: Math.round(dpi) },
            );
          }
        }
      }
    }
  }

  const errors = issues.filter((i) => i.level === 'error');
  const warnings = issues.filter((i) => i.level === 'warning');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    total: issues.length,
    validatedAt: new Date().toISOString(),
  };
}
