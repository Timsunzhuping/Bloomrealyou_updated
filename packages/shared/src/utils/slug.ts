/**
 * Convert an arbitrary string to a URL-safe slug.
 *
 * - Lowercases ASCII letters
 * - Strips diacritics (NFD + combining mark removal) so `Café` → `cafe`
 * - Replaces any run of non-alphanumeric characters with a single hyphen
 * - Trims leading/trailing hyphens and collapses repeats
 *
 * Non-Latin scripts (CJK, Arabic) survive as themselves; modern URLs handle
 * them fine, and we don't want to lossy-transliterate user-facing names.
 *
 * @example
 *   createSlug('Premium Cotton T-Shirt!')   // "premium-cotton-t-shirt"
 *   createSlug('  Café  Au  Lait  ')         // "cafe-au-lait"
 *   createSlug('定制 T 恤')                  // "定制-t-恤"
 */
export function createSlug(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .normalize('NFKD')
    // Strip combining diacritical marks
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    // Anything that is NOT a unicode letter / number becomes a hyphen
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '')
    // Collapse internal multi-hyphen runs (regex above already collapses, but be defensive)
    .replace(/-{2,}/g, '-');
}
