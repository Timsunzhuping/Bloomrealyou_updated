import { describe, expect, it } from 'vitest';

import {
  generateOrderNumber,
  generateProductionJobNumber,
  generateQuoteNumber,
  generateRFQNumber,
} from './numbers';

const FROZEN = new Date('2026-04-26T10:00:00Z');

describe('generators', () => {
  it('order numbers are prefixed with ORD- and dated', () => {
    const n = generateOrderNumber({ date: FROZEN });
    expect(n.startsWith('ORD-20260426-')).toBe(true);
    expect(n).toMatch(/^ORD-20260426-[A-Z0-9]{6}$/);
  });

  it('rfq numbers are prefixed with RFQ-', () => {
    expect(generateRFQNumber({ date: FROZEN })).toMatch(/^RFQ-20260426-[A-Z0-9]{6}$/);
  });

  it('quote numbers are prefixed with QUO-', () => {
    expect(generateQuoteNumber({ date: FROZEN })).toMatch(/^QUO-20260426-[A-Z0-9]{6}$/);
  });

  it('production-job numbers are prefixed with JOB-', () => {
    expect(generateProductionJobNumber({ date: FROZEN })).toMatch(/^JOB-20260426-[A-Z0-9]{6}$/);
  });

  it('produces distinct suffixes across many calls (collision sanity check)', () => {
    const set = new Set(Array.from({ length: 200 }, () => generateOrderNumber({ date: FROZEN })));
    expect(set.size).toBeGreaterThan(190);
  });

  it('honours custom suffix length', () => {
    const n = generateOrderNumber({ date: FROZEN, suffixLength: 10 });
    expect(n).toMatch(/^ORD-20260426-[A-Z0-9]{10}$/);
  });
});
