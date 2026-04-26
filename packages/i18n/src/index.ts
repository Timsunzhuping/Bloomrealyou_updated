import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtlLocale, type Locale } from '@custom-merch/shared';

import ar from '../locales/ar/common.json' with { type: 'json' };
import en from '../locales/en/common.json' with { type: 'json' };
import es from '../locales/es/common.json' with { type: 'json' };
import zhCN from '../locales/zh-CN/common.json' with { type: 'json' };

export type CommonMessages = typeof en;

const MESSAGES: Record<Locale, CommonMessages> = {
  en,
  'zh-CN': zhCN,
  es,
  ar,
};

export function getCommonMessages(locale: Locale): CommonMessages {
  return MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
}

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, isRtlLocale };
export type { Locale };
