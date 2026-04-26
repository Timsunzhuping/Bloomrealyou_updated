/** Top-level product categories sold on the platform. */
export const PRODUCT_CATEGORIES = [
  't-shirts',
  'hoodies',
  'mugs',
  'hats',
  'tote-bags',
  'stickers',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
