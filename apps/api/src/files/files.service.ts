import { Inject, Injectable, Logger } from '@nestjs/common';

import type { ProductionArtifact, StorageProvider } from '@custom-merch/shared';

import { STORAGE_PROVIDER } from '../storage/storage.tokens';

interface DataUrlParts {
  mime: string;
  buffer: Buffer;
}

type ProductionFormat = 'png' | 'svg' | 'pdf' | 'json';

const SUPPORTED_PREVIEW_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

/**
 * Parse a `data:` URL into raw bytes + content type. Returns null when the
 * input is not a recognisable data URL.
 */
export function parseDataUrl(dataUrl: string): DataUrlParts | null {
  const match = /^data:([^;,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const [, mime, base64] = match as unknown as [string, string, string];
  return { mime, buffer: Buffer.from(base64, 'base64') };
}

/**
 * Build the storage key for a design artefact. Layout:
 *   designs/{designId}/preview.png
 *   designs/{designId}/production.png
 *   designs/{designId}/source.json
 */
export function designStorageKey(
  designId: string,
  artefact: 'preview' | 'production' | 'source',
  ext: string,
): string {
  return `designs/${designId}/${artefact}.${ext}`;
}

@Injectable()
export class FilesService {
  private readonly log = new Logger(FilesService.name);

  constructor(@Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider) {}

  /** Upload a client-rendered preview image. Falls back to a 1×1 PNG when omitted. */
  async uploadPreview(designId: string, dataUrl?: string): Promise<{ url: string; size: number }> {
    let parts = dataUrl ? parseDataUrl(dataUrl) : null;
    if (!parts || !SUPPORTED_PREVIEW_MIME.has(parts.mime)) {
      // Server-side fallback: 1×1 transparent PNG.
      parts = { mime: 'image/png', buffer: TRANSPARENT_PNG };
    }
    const ext = MIME_TO_EXT[parts.mime] ?? 'png';
    const result = await this.storage.putObject({
      key: designStorageKey(designId, 'preview', ext),
      body: parts.buffer,
      contentType: parts.mime,
      cacheControl: 'public, max-age=300',
    });
    return { url: result.url, size: result.size };
  }

  /** Persist the source JSON snapshot. */
  async uploadSourceJson(
    designId: string,
    json: Record<string, unknown>,
  ): Promise<{ url: string; size: number }> {
    const buffer = Buffer.from(JSON.stringify(json, null, 2), 'utf8');
    const result = await this.storage.putObject({
      key: designStorageKey(designId, 'source', 'json'),
      body: buffer,
      contentType: 'application/json',
    });
    return { url: result.url, size: result.size };
  }

  /**
   * Generate production artefacts from the customizer source. A browser-captured
   * print-area PNG is used when provided; SVG/PDF/JSON are generated server-side
   * so production still receives structured output and source metadata.
   */
  async generateProduction(
    designId: string,
    designJson: Record<string, unknown>,
    productionDataUrl: string | undefined,
    formats: ProductionFormat[],
  ): Promise<ProductionArtifact[]> {
    const out: ProductionArtifact[] = [];
    const productionImage = productionDataUrl ? parseDataUrl(productionDataUrl) : null;

    if (formats.includes('png') && productionImage?.mime === 'image/png') {
      const result = await this.storage.putObject({
        key: designStorageKey(designId, 'production', 'png'),
        body: productionImage.buffer,
        contentType: 'image/png',
      });
      out.push({ format: 'png', url: result.url, size: result.size });
    } else if (formats.includes('png')) {
      this.log.warn(
        `[files] png production output skipped because no PNG print-area render was provided (design=${designId}).`,
      );
    }

    if (formats.includes('svg')) {
      const buffer = Buffer.from(buildProductionSvg(designJson, productionDataUrl), 'utf8');
      const result = await this.storage.putObject({
        key: designStorageKey(designId, 'production', 'svg'),
        body: buffer,
        contentType: 'image/svg+xml',
      });
      out.push({ format: 'svg', url: result.url, size: result.size });
    }

    if (formats.includes('pdf')) {
      const buffer = await buildProductionPdf(designId, designJson, productionImage);
      const result = await this.storage.putObject({
        key: designStorageKey(designId, 'production', 'pdf'),
        body: buffer,
        contentType: 'application/pdf',
      });
      out.push({ format: 'pdf', url: result.url, size: result.size });
    }

    if (formats.includes('json')) {
      const result = await this.uploadSourceJson(designId, designJson);
      out.push({ format: 'json', url: result.url, size: result.size });
    }

    return out;
  }
}

interface NormalizedProductionDesign {
  canvas: { width: number; height: number };
  printArea: { x: number; y: number; width: number; height: number };
  layers: Array<Record<string, unknown>>;
}

function normalizeProductionDesign(designJson: Record<string, unknown>): NormalizedProductionDesign {
  const canvas = (designJson.canvas as Record<string, unknown> | undefined) ?? {};
  const canvasWidth = readNumber(canvas.width, 800);
  const canvasHeight = readNumber(canvas.height, 800);
  const printArea = readRect(designJson.printAreaRect) ?? {
    x: 0,
    y: 0,
    width: canvasWidth,
    height: canvasHeight,
  };
  return {
    canvas: { width: canvasWidth, height: canvasHeight },
    printArea,
    layers: Array.isArray(canvas.objects) ? (canvas.objects as Array<Record<string, unknown>>) : [],
  };
}

function buildProductionSvg(
  designJson: Record<string, unknown>,
  productionDataUrl?: string,
): string {
  const design = normalizeProductionDesign(designJson);
  const width = Math.max(1, design.printArea.width);
  const height = Math.max(1, design.printArea.height);
  const nodes: string[] = [];

  nodes.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
  );
  nodes.push(`<metadata>${escapeXml(JSON.stringify(designJson))}</metadata>`);

  if (productionDataUrl?.startsWith('data:image/')) {
    nodes.push(
      `<image href="${escapeXml(productionDataUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>`,
    );
  } else {
    for (const layer of design.layers) {
      if (layer.visible === false) continue;
      const x = readNumber(layer.x, 0) - design.printArea.x;
      const y = readNumber(layer.y, 0) - design.printArea.y;
      const layerWidth = readNumber(layer.width, 0);
      const layerHeight = readNumber(layer.height, 0);
      const opacity = readNumber(layer.opacity, 1);
      const rotation = readNumber(layer.rotation, 0);
      const cx = x + layerWidth / 2;
      const cy = y + layerHeight / 2;
      const transform = rotation ? ` transform="rotate(${rotation} ${cx} ${cy})"` : '';

      if (layer.type === 'text') {
        const align = layer.textAlign === 'right' ? 'end' : layer.textAlign === 'center' ? 'middle' : 'start';
        const textX = align === 'middle' ? x + layerWidth / 2 : align === 'end' ? x + layerWidth : x;
        const textY = y + readNumber(layer.fontSize, 16);
        nodes.push(
          `<text x="${textX}" y="${textY}" font-family="${escapeXml(String(layer.fontFamily ?? 'Inter'))}" font-size="${readNumber(layer.fontSize, 16)}" font-weight="${readNumber(layer.fontWeight, 400)}" fill="${escapeXml(String(layer.color ?? '#111827'))}" text-anchor="${align}" opacity="${opacity}"${transform}>${escapeXml(String(layer.text ?? ''))}</text>`,
        );
      }

      if (layer.type === 'image' && typeof layer.src === 'string' && layer.src.startsWith('data:image/')) {
        nodes.push(
          `<image href="${escapeXml(layer.src)}" x="${x}" y="${y}" width="${layerWidth}" height="${layerHeight}" opacity="${opacity}"${transform}/>` ,
        );
      }
    }
  }

  nodes.push('</svg>');
  return nodes.join('');
}

async function buildProductionPdf(
  designId: string,
  designJson: Record<string, unknown>,
  productionImage: DataUrlParts | null,
): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const design = normalizeProductionDesign(designJson);
  const width = Math.max(144, design.printArea.width);
  const height = Math.max(144, design.printArea.height);
  const doc = new PDFDocument({ margin: 24, size: [width, height] });
  const chunks: Buffer[] = [];

  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });

  doc.info.Title = `Production file ${designId}`;
  doc.info.Subject = 'Bloomrealyou custom artwork production export';

  if (productionImage && ['image/png', 'image/jpeg'].includes(productionImage.mime)) {
    doc.image(productionImage.buffer, 0, 0, { width, height });
  } else {
    doc.fontSize(14).font('Helvetica-Bold').text('Production artwork source', 24, 24);
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica').text(`Design ID: ${designId}`);
    doc.text(`Canvas: ${design.canvas.width} x ${design.canvas.height}px`);
    doc.text(
      `Print area: x=${design.printArea.x}, y=${design.printArea.y}, width=${design.printArea.width}, height=${design.printArea.height}`,
    );
    doc.moveDown(0.75);
    doc.fontSize(10).font('Helvetica-Bold').text('Layers');
    doc.fontSize(8).font('Helvetica');
    for (const layer of design.layers) {
      doc.text(
        `${String(layer.type ?? 'layer')} ${String(layer.id ?? '')}: x=${readNumber(layer.x, 0)}, y=${readNumber(layer.y, 0)}, w=${readNumber(layer.width, 0)}, h=${readNumber(layer.height, 0)}`,
      );
    }
  }

  doc.end();
  return done;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readRect(value: unknown): NormalizedProductionDesign['printArea'] | null {
  if (!value || typeof value !== 'object') return null;
  const r = value as Record<string, unknown>;
  if (
    typeof r.x !== 'number' ||
    typeof r.y !== 'number' ||
    typeof r.width !== 'number' ||
    typeof r.height !== 'number'
  ) {
    return null;
  }
  return { x: r.x, y: r.y, width: r.width, height: r.height };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

/** 1×1 fully-transparent PNG used as a safe fallback. */
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64',
);
