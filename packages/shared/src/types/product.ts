import type { Currency } from '../constants/currencies';
import type { Locale } from '../constants/locales';
import type { PrintMethod } from '../constants/print-methods';
import type { ProductCategory } from '../constants/product-categories';
import type { ProductStatus } from '../constants/statuses';

import type { Brand, Money, SoftDeletable, Timestamps } from './common';

export type ProductId = Brand<string, 'ProductId'>;
export type ProductVariantId = Brand<string, 'ProductVariantId'>;
export type ProductPrintAreaId = Brand<string, 'ProductPrintAreaId'>;
export type ProductPriceTierId = Brand<string, 'ProductPriceTierId'>;

/** Localised string with locale → text mapping. */
export type LocalisedString = Partial<Record<Locale, string>> & { en: string };

/** Sellable product (e.g. "Premium Cotton T-Shirt"). */
export interface Product extends Timestamps, SoftDeletable {
  id: ProductId;
  slug: string;
  category: ProductCategory;
  status: ProductStatus;
  name: LocalisedString;
  description: LocalisedString;
  /** Default decoration methods supported by the product. */
  supportedPrintMethods: PrintMethod[];
  /** Hero / gallery image URLs (mockups). */
  imageUrls: string[];
  /** Default unit price for the cheapest variant; used for catalog display. */
  basePrice: Money;
  /** Free-form tags for filtering, e.g. ["organic", "unisex"]. */
  tags: string[];
  /** Average lead time in business days for production. */
  productionLeadDays: number;
}

/** Concrete SKU (e.g. "T-Shirt — Black — XL"). */
export interface ProductVariant extends Timestamps, SoftDeletable {
  id: ProductVariantId;
  productId: ProductId;
  sku: string;
  /** Free-form attribute map: { color: 'black', size: 'XL', material: '100% cotton' }. */
  attributes: Record<string, string>;
  price: Money;
  /** Inventory not tracked at variant level on this platform — produced on demand. */
  weightGrams?: number;
  isActive: boolean;
}

/** Decoratable region on a product (e.g. front, back, left sleeve). */
export interface ProductPrintArea {
  id: ProductPrintAreaId;
  productId: ProductId;
  /** Stable key referenced by designs and templates. */
  key: string;
  label: LocalisedString;
  /** Printable area in pixels at 300 DPI for the customizer canvas. */
  widthPx: number;
  heightPx: number;
  /** Offset of this print area on the product mockup, used for live preview. */
  mockupOffsetXPx: number;
  mockupOffsetYPx: number;
  /** Subset of {@link PrintMethod} valid for this area. */
  allowedPrintMethods: PrintMethod[];
}

/** Volume discount tier: e.g. ≥ 50 units → 8 USD each. */
export interface ProductPriceTier {
  id: ProductPriceTierId;
  productId: ProductId;
  /** Inclusive lower bound of quantity range. */
  minQuantity: number;
  /** Exclusive upper bound, or `null` for the open-ended top tier. */
  maxQuantity: number | null;
  unitPrice: Money;
  /** Optional currency-scoped tier (when omitted the tier applies to all). */
  currency?: Currency;
  printMethod?: PrintMethod;
}
