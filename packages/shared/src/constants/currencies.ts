/** ISO-4217 currencies supported for storefront pricing and checkout. */
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'CNY'] as const;

export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

/** Default platform currency. */
export const DEFAULT_CURRENCY: Currency = 'USD';

/**
 * Number of minor units per major unit (e.g. cents per dollar).
 * All currencies on this platform use 2 decimal digits.
 */
export const CURRENCY_DECIMALS: Record<Currency, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  AED: 2,
  CNY: 2,
};
