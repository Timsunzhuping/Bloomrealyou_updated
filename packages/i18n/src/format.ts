import {
  CURRENCY_DECIMALS,
  type Currency,
  type IsoDateString,
  type Locale,
  type Money,
} from '@custom-merch/shared';

/** Locale-aware currency formatter. Wraps `Intl.NumberFormat`. */
export function formatCurrency(money: Money, locale: Locale): string {
  const decimals = CURRENCY_DECIMALS[money.currency] ?? 2;
  const major = money.amountMinor / Math.pow(10, decimals);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/** Locale-aware currency formatter from a major-unit amount. */
export function formatCurrencyAmount(amountMajor: number, currency: Currency, locale: Locale): string {
  return formatCurrency(
    { amountMinor: Math.round(amountMajor * 100), currency },
    locale,
  );
}

export type DatePreset = 'date' | 'datetime' | 'short-date' | 'long-date' | 'time';

const PRESETS: Record<DatePreset, Intl.DateTimeFormatOptions> = {
  date: { year: 'numeric', month: '2-digit', day: '2-digit' },
  datetime: {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  },
  'short-date': { month: 'short', day: 'numeric' },
  'long-date': { year: 'numeric', month: 'long', day: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
};

/** Locale-aware date formatter. */
export function formatLocalisedDate(
  value: Date | IsoDateString,
  locale: Locale,
  preset: DatePreset = 'date',
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`formatLocalisedDate: invalid input "${String(value)}"`);
  }
  return new Intl.DateTimeFormat(locale, PRESETS[preset]).format(date);
}
