/** Catalog of base product categories sold on the platform. */
export const PRODUCT_CATEGORIES = [
  't-shirt',
  'hoodie',
  'mug',
  'hat',
  'tote-bag',
  'sticker',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

/** Default platform currency. */
export const DEFAULT_CURRENCY = 'USD';

/** Logical names for adapter-based external services. Implementations live in apps/api. */
export const EXTERNAL_SERVICE_NAMES = {
  PAYMENT: 'PaymentProvider',
  AI: 'AIProvider',
  STORAGE: 'StorageProvider',
  EMAIL: 'EmailProvider',
} as const;
