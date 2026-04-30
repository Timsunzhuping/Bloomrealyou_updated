/** Supported UI locales across web, admin, email, and AI prompts. */
export const SUPPORTED_LOCALES = ['en', 'zh-CN', 'es', 'ar'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale used when none is supplied or the supplied one isn't supported. */
export const DEFAULT_LOCALE: Locale = 'en';

/** Locales that use right-to-left scripts. */
export const RTL_LOCALES: readonly Locale[] = ['ar'] as const;

/** Returns true if the locale should be rendered in RTL direction. */
export const isRtlLocale = (locale: Locale): boolean => RTL_LOCALES.includes(locale);
