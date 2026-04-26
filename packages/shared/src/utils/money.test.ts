import { describe, expect, it } from 'vitest';

import {
  addMoney,
  applyPercentageToMoney,
  calculatePercentage,
  formatMoney,
  makeMoney,
  multiplyMoney,
  subtractMoney,
} from './money';

describe('formatMoney', () => {
  it('formats USD in en locale', () => {
    expect(formatMoney({ amountMinor: 1999, currency: 'USD' }, 'en')).toBe('$19.99');
  });

  it('formats CNY in zh-CN locale', () => {
    expect(formatMoney({ amountMinor: 12345, currency: 'CNY' }, 'zh-CN')).toContain('123.45');
  });
});

describe('arithmetic', () => {
  it('adds same-currency money', () => {
    expect(
      addMoney({ amountMinor: 100, currency: 'USD' }, { amountMinor: 250, currency: 'USD' }),
    ).toEqual({ amountMinor: 350, currency: 'USD' });
  });

  it('throws when adding mismatched currencies', () => {
    expect(() =>
      addMoney({ amountMinor: 100, currency: 'USD' }, { amountMinor: 100, currency: 'EUR' }),
    ).toThrow();
  });

  it('subtracts same-currency money', () => {
    expect(
      subtractMoney({ amountMinor: 500, currency: 'USD' }, { amountMinor: 199, currency: 'USD' }),
    ).toEqual({ amountMinor: 301, currency: 'USD' });
  });

  it('multiplies and rounds money', () => {
    expect(multiplyMoney({ amountMinor: 333, currency: 'USD' }, 3)).toEqual({
      amountMinor: 999,
      currency: 'USD',
    });
  });

  it('builds money from major units', () => {
    expect(makeMoney(19.99, 'USD')).toEqual({ amountMinor: 1999, currency: 'USD' });
  });
});

describe('calculatePercentage', () => {
  it('computes integer percentages', () => {
    expect(calculatePercentage(1000, 8.25)).toBe(83);
  });

  it('handles zero amount', () => {
    expect(calculatePercentage(0, 50)).toBe(0);
  });

  it('rejects non-finite inputs', () => {
    expect(() => calculatePercentage(NaN, 5)).toThrow();
    expect(() => calculatePercentage(100, Infinity)).toThrow();
  });

  it('applies a percentage to Money', () => {
    expect(applyPercentageToMoney({ amountMinor: 10000, currency: 'USD' }, 7.5)).toEqual({
      amountMinor: 750,
      currency: 'USD',
    });
  });
});
