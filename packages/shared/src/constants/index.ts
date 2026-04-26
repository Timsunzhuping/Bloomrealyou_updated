export * from './locales';
export * from './currencies';
export * from './product-categories';
export * from './print-methods';
export * from './roles';
export * from './statuses';

/** Logical names for adapter-based external services. */
export const EXTERNAL_SERVICE_NAMES = {
  PAYMENT: 'PaymentProvider',
  AI: 'AIProvider',
  STORAGE: 'StorageProvider',
  EMAIL: 'EmailProvider',
} as const;
