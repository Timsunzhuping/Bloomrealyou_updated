import type { Locale } from '../constants/locales';
import type { IsoDateString } from '../types/common';

/** Pre-defined date format presets used across the platform. */
export type DateFormatPreset = 'date' | 'datetime' | 'short-date' | 'long-date' | 'time';

const PRESET_OPTIONS: Record<DateFormatPreset, Intl.DateTimeFormatOptions> = {
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

/**
 * Locale-aware date formatter wrapping `Intl.DateTimeFormat`.
 *
 * @example
 *   formatDate('2026-04-26T10:00:00Z', 'en')                     // "04/26/2026"
 *   formatDate(new Date(), 'zh-CN', 'long-date')                 // "2026年4月26日"
 *   formatDate('2026-04-26T10:00:00Z', 'es', 'datetime')         // "26/04/2026, 10:00"
 */
export function formatDate(
  value: Date | IsoDateString,
  locale: Locale | string = 'en',
  preset: DateFormatPreset = 'date',
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`formatDate: invalid date input "${String(value)}"`);
  }
  return new Intl.DateTimeFormat(locale, PRESET_OPTIONS[preset]).format(date);
}

/** Returns the current time as an ISO date string. */
export function nowIso(): IsoDateString {
  return new Date().toISOString();
}
