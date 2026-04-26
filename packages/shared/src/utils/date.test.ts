import { describe, expect, it } from 'vitest';

import { formatDate, nowIso } from './date';

describe('formatDate', () => {
  it('formats an ISO string as a date in en locale', () => {
    expect(formatDate('2026-04-26T10:00:00Z', 'en', 'date')).toMatch(/04\/26\/2026/);
  });

  it('formats datetime preset', () => {
    const out = formatDate('2026-04-26T10:00:00Z', 'en', 'datetime');
    expect(out).toMatch(/2026/);
    expect(out).toMatch(/[0-9]{2}:[0-9]{2}/);
  });

  it('throws on invalid input', () => {
    expect(() => formatDate('not-a-date', 'en')).toThrow();
  });
});

describe('nowIso', () => {
  it('returns a parseable ISO string', () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });
});
