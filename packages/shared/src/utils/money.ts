import { CURRENCY_DECIMALS, type Currency } from '../constants/currencies';
import type { Locale } from '../constants/locales';
import type { Money } from '../types/common';

/**
 * Format a {@link Money} value using `Intl.NumberFormat` for the given locale.
 *
 * @example
 *   formatMoney({ amountMinor: 1999, currency: 'USD' }, 'en')   // "$19.99"
 *   formatMoney({ amountMinor: 1999, currency: 'EUR' }, 'es')   // "19,99 €"
 */
export function formatMoney(money: Money, locale: Locale | string = 'en'): string {
  const decimals = CURRENCY_DECIMALS[money.currency] ?? 2;
  const major = money.amountMinor / Math.pow(10, decimals);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(major);
}

/** Add two `Money` values; throws if currencies differ. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add money with different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}

/** Subtract `b` from `a`; throws if currencies differ. */
export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot subtract money with different currencies: ${a.currency} vs ${b.currency}`,
    );
  }
  return { amountMinor: a.amountMinor - b.amountMinor, currency: a.currency };
}

/** Multiply a money value by an integer factor (e.g. quantity). */
export function multiplyMoney(money: Money, factor: number): Money {
  if (!Number.isFinite(factor)) {
    throw new Error('multiplyMoney: factor must be finite');
  }
  return { amountMinor: Math.round(money.amountMinor * factor), currency: money.currency };
}

/** Construct a `Money` value from a major-unit amount (e.g. dollars). */
export function makeMoney(amountMajor: number, currency: Currency): Money {
  const decimals = CURRENCY_DECIMALS[currency] ?? 2;
  return {
    amountMinor: Math.round(amountMajor * Math.pow(10, decimals)),
    currency,
  };
}

/**
 * Apply a percentage to a numeric amount (in minor units or raw integers).
 * The result is rounded with banker's rounding (`Math.round`) — sufficient
 * for tax / discount math at the cents level.
 *
 * @example
 *   calculatePercentage(1000, 8.25) // 83  (8.25% of 1000)
 */
export function calculatePercentage(amount: number, percentage: number): number {
  if (!Number.isFinite(amount) || !Number.isFinite(percentage)) {
    throw new Error('calculatePercentage: amount and percentage must be finite numbers');
  }
  return Math.round((amount * percentage) / 100);
}

/** Apply a percentage to a `Money` value, rounding to whole minor units. */
export function applyPercentageToMoney(money: Money, percentage: number): Money {
  return {
    amountMinor: calculatePercentage(money.amountMinor, percentage),
    currency: money.currency,
  };
}
