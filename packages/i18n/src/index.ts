/**
 * Public API of `@custom-merch/i18n`.
 *
 * Apps consume this barrel for both server-side rendering helpers
 * (`getMessages`, `getNamespaceMessages`) and client-side helpers
 * (`getLocalizedPath`, `formatCurrency`, …).
 */
import type { Locale } from '@custom-merch/shared';

import { getNamespaceMessages, type Messages } from './messages';

export * from './messages';
export * from './paths';
export * from './format';

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  RTL_LOCALES,
  isRtlLocale,
  isSupportedLocale,
  coerceLocale,
} from '@custom-merch/shared';
export type { Locale } from '@custom-merch/shared';

/**
 * Backwards-compatible helper used by older callers (apps/web, apps/admin)
 * before they were migrated to next-intl.
 */
export function getCommonMessages(locale: Locale): Messages['common'] {
  return getNamespaceMessages(locale, 'common');
}
