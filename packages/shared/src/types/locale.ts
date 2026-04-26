/** Supported UI locales. */
export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'es', 'ar'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Locales that use right-to-left scripts. */
export const RTL_LOCALES: readonly Locale[] = ['ar'] as const;

export const isRtlLocale = (locale: Locale): boolean => RTL_LOCALES.includes(locale);
