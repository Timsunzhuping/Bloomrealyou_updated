'use client';

import { create } from 'zustand';

import type {
  AreaRect,
  CustomizerDesignSnapshot,
  ImageLayer,
  Layer,
  TextLayer,
} from './types';

interface CustomizerState {
  /** Stable ids for the design context (filled when the page mounts). */
  productId: string;
  productSlug: string;
  variantId: string | null;
  /** Default print area key from the loaded product. */
  printAreaKey: string;
  /** Logical canvas size — fixed for the MVP; layers position relative to it. */
  canvasWidth: number;
  canvasHeight: number;
  /** Canvas-local rectangle of the printable region. */
  printArea: AreaRect;
  /** Slightly inset rectangle for safe content. */
  safeArea: AreaRect;

  layers: Layer[];
  selectedLayerId: string | null;
  /** Increments every time the design changes — used to flag unsaved drafts. */
  dirtyTick: number;
}

interface CustomizerActions {
  setContext(input: {
    productId: string;
    productSlug: string;
    variantId: string | null;
    printAreaKey: string;
    canvasWidth: number;
    canvasHeight: number;
    printArea: AreaRect;
    safeArea: AreaRect;
  }): void;
  reset(): void;

  addText(text: string): void;
  addImage(input: {
    src: string;
    filename: string;
    mime?: string;
    naturalWidth: number;
    naturalHeight: number;
  }): void;
  updateLayer(id: string, patch: Partial<Layer>): void;
  removeLayer(id: string): void;
  selectLayer(id: string | null): void;
  bringForward(id: string): void;
  sendBackward(id: string): void;

  toDesignJson(): CustomizerDesignSnapshot;
  loadDesignJson(snapshot: CustomizerDesignSnapshot): void;
}

const DEFAULT_STATE: CustomizerState = {
  productId: '',
  productSlug: '',
  variantId: null,
  printAreaKey: 'front',
  canvasWidth: 800,
  canvasHeight: 800,
  printArea: { x: 200, y: 200, width: 400, height: 400 },
  safeArea: { x: 220, y: 220, width: 360, height: 360 },
  layers: [],
  selectedLayerId: null,
  dirtyTick: 0,
};

let layerSeq = 0;
function newLayerId(): string {
  layerSeq += 1;
  return `layer_${Date.now().toString(36)}_${layerSeq}`;
}

export const useCustomizerStore = create<CustomizerState & CustomizerActions>((set, get) => ({
  ...DEFAULT_STATE,

  setContext: (input) =>
    set((s) => ({
      ...s,
      productId: input.productId,
      productSlug: input.productSlug,
      variantId: input.variantId,
      printAreaKey: input.printAreaKey,
      canvasWidth: input.canvasWidth,
      canvasHeight: input.canvasHeight,
      printArea: input.printArea,
      safeArea: input.safeArea,
    })),

  reset: () => set(() => ({ ...DEFAULT_STATE })),

  addText: (text) => {
    const { canvasWidth, canvasHeight } = get();
    const layer: TextLayer = {
      id: newLayerId(),
      type: 'text',
      text,
      x: canvasWidth / 2 - 120,
      y: canvasHeight / 2 - 30,
      width: 240,
      height: 60,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      fontFamily: 'Inter',
      fontSize: 36,
      fontWeight: 600,
      color: '#111827',
      textAlign: 'center',
    };
    set((s) => ({
      ...s,
      layers: [...s.layers, layer],
      selectedLayerId: layer.id,
      dirtyTick: s.dirtyTick + 1,
    }));
  },

  addImage: (input) => {
    const { canvasWidth, canvasHeight } = get();
    const ratio = input.naturalWidth / input.naturalHeight || 1;
    const targetWidth = Math.min(360, input.naturalWidth);
    const targetHeight = targetWidth / ratio;
    const layer: ImageLayer = {
      id: newLayerId(),
      type: 'image',
      src: input.src,
      filename: input.filename,
      mime: input.mime,
      naturalWidth: input.naturalWidth,
      naturalHeight: input.naturalHeight,
      x: canvasWidth / 2 - targetWidth / 2,
      y: canvasHeight / 2 - targetHeight / 2,
      width: targetWidth,
      height: targetHeight,
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
    };
    set((s) => ({
      ...s,
      layers: [...s.layers, layer],
      selectedLayerId: layer.id,
      dirtyTick: s.dirtyTick + 1,
    }));
  },

  updateLayer: (id, patch) =>
    set((s) => ({
      ...s,
      layers: s.layers.map((l) =>
        l.id === id ? ({ ...l, ...patch } as Layer) : l,
      ),
      dirtyTick: s.dirtyTick + 1,
    })),

  removeLayer: (id) =>
    set((s) => ({
      ...s,
      layers: s.layers.filter((l) => l.id !== id),
      selectedLayerId: s.selectedLayerId === id ? null : s.selectedLayerId,
      dirtyTick: s.dirtyTick + 1,
    })),

  selectLayer: (id) => set((s) => ({ ...s, selectedLayerId: id })),

  bringForward: (id) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      if (idx === -1 || idx === s.layers.length - 1) return s;
      const next = s.layers.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(idx + 1, 0, moved!);
      return { ...s, layers: next, dirtyTick: s.dirtyTick + 1 };
    }),

  sendBackward: (id) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      if (idx <= 0) return s;
      const next = s.layers.slice();
      const [moved] = next.splice(idx, 1);
      next.splice(idx - 1, 0, moved!);
      return { ...s, layers: next, dirtyTick: s.dirtyTick + 1 };
    }),

  toDesignJson: () => {
    const s = get();
    return {
      productId: s.productId,
      productSlug: s.productSlug,
      variantId: s.variantId,
      printArea: s.printAreaKey,
      printAreaRect: s.printArea,
      safeAreaRect: s.safeArea,
      canvas: {
        width: s.canvasWidth,
        height: s.canvasHeight,
        objects: s.layers,
      },
      metadata: {
        createdWith: 'customizer-v1',
        createdAt: new Date().toISOString(),
      },
    };
  },

  loadDesignJson: (snapshot) => {
    set((s) => ({
      ...s,
      productId: snapshot.productId,
      productSlug: snapshot.productSlug,
      variantId: snapshot.variantId,
      printAreaKey: snapshot.printArea,
      canvasWidth: snapshot.canvas.width,
      canvasHeight: snapshot.canvas.height,
      printArea: snapshot.printAreaRect ?? s.printArea,
      safeArea: snapshot.safeAreaRect ?? s.safeArea,
      layers: snapshot.canvas.objects,
      selectedLayerId: null,
      dirtyTick: 0,
    }));
  },
}));

/** Returns true if the rect extends past the safe area. */
export function isOutsideSafeArea(
  layer: Layer,
  safeArea: AreaRect,
): boolean {
  const layerRight = layer.x + layer.width;
  const layerBottom = layer.y + layer.height;
  const safeRight = safeArea.x + safeArea.width;
  const safeBottom = safeArea.y + safeArea.height;
  return (
    layer.x < safeArea.x ||
    layer.y < safeArea.y ||
    layerRight > safeRight ||
    layerBottom > safeBottom
  );
}

/** Heuristic DPI check for image layers. */
export function isLowResolution(layer: Layer): boolean {
  if (layer.type !== 'image') return false;
  const renderedWidthInches = layer.width / 96; // canvas approx 96dpi
  if (renderedWidthInches <= 0) return false;
  const effectiveDpi = layer.naturalWidth / renderedWidthInches;
  return effectiveDpi < 150;
}
