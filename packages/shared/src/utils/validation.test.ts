import { describe, expect, it } from 'vitest';

import {
  coerceCurrency,
  coerceLocale,
  isPrintMethod,
  isProductCategory,
  isSupportedCurrency,
  isSupportedLocale,
  isUserRole,
} from './validation';

describe('locale guards', () => {
  it('accepts known locales', () => {
    expect(isSupportedLocale('en')).toBe(true);
    expect(isSupportedLocale('zh-CN')).toBe(true);
  });

  it('rejects unknown / non-string values', () => {
    expect(isSupportedLocale('xx')).toBe(false);
    expect(isSupportedLocale(123)).toBe(false);
    expect(isSupportedLocale(undefined)).toBe(false);
  });

  it('coerces invalid locale to fallback', () => {
    expect(coerceLocale('zz', 'en')).toBe('en');
    expect(coerceLocale('ar', 'en')).toBe('ar');
  });
});

describe('currency guards', () => {
  it('accepts supported currencies and rejects others', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
    expect(isSupportedCurrency('JPY')).toBe(false);
    expect(coerceCurrency(undefined, 'USD')).toBe('USD');
  });
});

describe('domain guards', () => {
  it('recognises product categories and print methods', () => {
    expect(isProductCategory('t-shirts')).toBe(true);
    expect(isProductCategory('socks')).toBe(false);
    expect(isPrintMethod('dtg')).toBe(true);
    expect(isPrintMethod('laser')).toBe(false);
  });

  it('recognises user roles', () => {
    expect(isUserRole('customer')).toBe(true);
    expect(isUserRole('admin')).toBe(true);
    expect(isUserRole('hacker')).toBe(false);
  });
});
