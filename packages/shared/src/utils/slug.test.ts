import { describe, expect, it } from 'vitest';

import { createSlug } from './slug';

describe('createSlug', () => {
  it('lower-cases ASCII and joins words with hyphens', () => {
    expect(createSlug('Premium Cotton T-Shirt!')).toBe('premium-cotton-t-shirt');
  });

  it('strips diacritics on Latin scripts', () => {
    expect(createSlug('Café au lait')).toBe('cafe-au-lait');
  });

  it('collapses multiple separators and trims edges', () => {
    expect(createSlug('   ---  Hello   ___ World  --- ')).toBe('hello-world');
  });

  it('preserves CJK characters', () => {
    expect(createSlug('定制 T 恤')).toBe('定制-t-恤');
  });

  it('returns empty string for non-string input', () => {
    // @ts-expect-error testing runtime guard
    expect(createSlug(undefined)).toBe('');
  });
});
