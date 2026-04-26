import { SUPPORTED_CURRENCIES, type Currency } from '../constants/currencies';
import { SUPPORTED_LOCALES, type Locale } from '../constants/locales';
import { PRINT_METHODS, type PrintMethod } from '../constants/print-methods';
import { PRODUCT_CATEGORIES, type ProductCategory } from '../constants/product-categories';
import { USER_ROLES, type UserRole } from '../constants/roles';

/** Type-guard: checks if `value` is one of the supported {@link Locale}s. */
export function isSupportedLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Type-guard: checks if `value` is one of the supported {@link Currency} codes. */
export function isSupportedCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

/** Type-guard: checks if `value` is one of the supported {@link ProductCategory}s. */
export function isProductCategory(value: unknown): value is ProductCategory {
  return typeof value === 'string' && (PRODUCT_CATEGORIES as readonly string[]).includes(value);
}

/** Type-guard: checks if `value` is one of the supported {@link PrintMethod}s. */
export function isPrintMethod(value: unknown): value is PrintMethod {
  return typeof value === 'string' && (PRINT_METHODS as readonly string[]).includes(value);
}

/** Type-guard: checks if `value` is one of the supported {@link UserRole}s. */
export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (USER_ROLES as readonly string[]).includes(value);
}

/** Returns the locale if supported, otherwise the supplied fallback. */
export function coerceLocale(value: unknown, fallback: Locale): Locale {
  return isSupportedLocale(value) ? value : fallback;
}

/** Returns the currency if supported, otherwise the supplied fallback. */
export function coerceCurrency(value: unknown, fallback: Currency): Currency {
  return isSupportedCurrency(value) ? value : fallback;
}
