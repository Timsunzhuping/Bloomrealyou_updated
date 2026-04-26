import { validateDesign } from './validation.engine';

const safeArea = { x: 220, y: 220, width: 360, height: 360 };
const printArea = { x: 200, y: 200, width: 400, height: 400 };

describe('validateDesign', () => {
  it('flags an empty design as an error', () => {
    const r = validateDesign({
      designJson: { canvas: { width: 800, height: 800, objects: [] } },
      hasPreview: false,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'design_empty')).toBe(true);
    expect(r.warnings.some((w) => w.code === 'preview_missing')).toBe(true);
  });

  it('warns when text is below the readable threshold', () => {
    const r = validateDesign({
      designJson: {
        canvas: { width: 800, height: 800 },
        printAreaRect: printArea,
        safeAreaRect: safeArea,
        layers: [
          { id: 'l1', type: 'text', text: 'tiny', x: 240, y: 240, width: 100, height: 20, fontSize: 9 },
        ],
      },
      hasPreview: true,
    });
    expect(r.warnings.some((w) => w.code === 'text_too_small')).toBe(true);
  });

  it('errors when a layer falls outside the print area', () => {
    const r = validateDesign({
      designJson: {
        canvas: { width: 800, height: 800 },
        printAreaRect: printArea,
        safeAreaRect: safeArea,
        layers: [
          { id: 'l1', type: 'text', text: 'hello', x: 50, y: 50, width: 80, height: 30, fontSize: 24 },
        ],
      },
      hasPreview: true,
    });
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.code === 'object_outside_print_area')).toBe(true);
  });

  it('flags low-resolution images as warnings', () => {
    const r = validateDesign({
      designJson: {
        canvas: { width: 800, height: 800 },
        printAreaRect: printArea,
        safeAreaRect: safeArea,
        layers: [
          {
            id: 'i1',
            type: 'image',
            x: 240,
            y: 240,
            width: 320,
            height: 240,
            naturalWidth: 200,
            naturalHeight: 150,
            mime: 'image/png',
          },
        ],
      },
      hasPreview: true,
    });
    expect(r.warnings.some((w) => w.code === 'image_low_resolution')).toBe(true);
  });

  it('rejects unsupported image formats', () => {
    const r = validateDesign({
      designJson: {
        canvas: { width: 800, height: 800 },
        layers: [
          {
            id: 'i1',
            type: 'image',
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            mime: 'image/heic',
          },
        ],
      },
      hasPreview: true,
    });
    expect(r.errors.some((e) => e.code === 'image_unsupported_format')).toBe(true);
  });

  it('passes a clean design', () => {
    const r = validateDesign({
      designJson: {
        canvas: { width: 800, height: 800 },
        printAreaRect: printArea,
        safeAreaRect: safeArea,
        layers: [
          { id: 'l1', type: 'text', text: 'Hello', x: 240, y: 240, width: 200, height: 60, fontSize: 36 },
        ],
      },
      hasPreview: true,
    });
    expect(r.ok).toBe(true);
    expect(r.errors).toHaveLength(0);
  });
});
