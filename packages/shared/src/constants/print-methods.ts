/** Print / decoration methods supported by the supplier network. */
export const PRINT_METHODS = [
  'dtg',
  'screen_printing',
  'embroidery',
  'heat_transfer',
  'uv_printing',
  'sublimation',
] as const;

export type PrintMethod = (typeof PRINT_METHODS)[number];
