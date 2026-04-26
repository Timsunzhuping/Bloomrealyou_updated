import type { Money } from '../types/common.js';

/** Format a Money value using Intl.NumberFormat for the given locale. */
export function formatMoney(money: Money, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: money.currency,
  }).format(money.amountMinor / 100);
}

/** Add two Money values. Throws if currencies don't match. */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add money with different currencies: ${a.currency} vs ${b.currency}`);
  }
  return { amountMinor: a.amountMinor + b.amountMinor, currency: a.currency };
}
