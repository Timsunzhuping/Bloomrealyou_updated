import type {
  OrderNumber,
} from '../types/order';
import type { ProductionJobNumber } from '../types/production';
import type { QuoteNumber } from '../types/quote';
import type { RfqNumber } from '../types/rfq';

/**
 * Generate a fixed-length, URL-safe random suffix using crypto-grade entropy.
 *
 * Uses `crypto.getRandomValues` (available in Node ≥ 16, browsers, and edge
 * runtimes) and projects bytes into the alphabet `A-Z0-9`, so the result
 * collation-sorts the same as the visual order.
 */
function randomSuffix(length: number): string {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Crockford-ish, no I/O/0/1
  const bytes = new Uint8Array(length);
  // Globally available in Node 18+, browsers, and edge.
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET.charAt(bytes[i]! % ALPHABET.length);
  }
  return out;
}

function ymdUtc(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0');
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const d = date.getUTCDate().toString().padStart(2, '0');
  return `${y}${m}${d}`;
}

interface NumberOptions {
  /** Override the date used in the prefix (defaults to `new Date()`). */
  date?: Date;
  /** Override the random-suffix length (defaults to 6). */
  suffixLength?: number;
}

function build(prefix: string, opts?: NumberOptions): string {
  const { date = new Date(), suffixLength = 6 } = opts ?? {};
  return `${prefix}-${ymdUtc(date)}-${randomSuffix(suffixLength)}`;
}

/** Generate a customer-visible order number, e.g. `ORD-20260426-A7BC92`. */
export function generateOrderNumber(opts?: NumberOptions): OrderNumber {
  return build('ORD', opts) as OrderNumber;
}

/** Generate an RFQ number, e.g. `RFQ-20260426-A7BC92`. */
export function generateRFQNumber(opts?: NumberOptions): RfqNumber {
  return build('RFQ', opts) as RfqNumber;
}

/** Generate a quote number, e.g. `QUO-20260426-A7BC92`. */
export function generateQuoteNumber(opts?: NumberOptions): QuoteNumber {
  return build('QUO', opts) as QuoteNumber;
}

/** Generate a production job number, e.g. `JOB-20260426-A7BC92`. */
export function generateProductionJobNumber(opts?: NumberOptions): ProductionJobNumber {
  return build('JOB', opts) as ProductionJobNumber;
}
