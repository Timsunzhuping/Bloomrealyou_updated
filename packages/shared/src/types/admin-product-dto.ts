/**
 * Admin-facing wire formats for the product CRUD surface. The admin app
 * authors localised text through {@link LocalisedString}, mirrors the public
 * `Product` shape, and exposes nested resources (variants, print areas, price
 * tiers) as their own endpoints.
 */
import type { Currency } from '../constants/currencies';
import type { PrintMethod } from '../constants/print-methods';
import type { ProductCategory } from '../constants/product-categories';
import type { ProductStatus } from '../constants/statuses';

import type { Money } from './common';
import type { LocalisedString } from './product';

export interface AdminProductVariantDto {
  id: string;
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  price: Money;
  weightGrams?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProductPrintAreaDto {
  id: string;
  productId: string;
  key: string;
  label: LocalisedString;
  widthPx: number;
  heightPx: number;
  mockupOffsetXPx: number;
  mockupOffsetYPx: number;
  allowedPrintMethods: PrintMethod[];
}

export interface AdminProductPriceTierDto {
  id: string;
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPrice: Money;
  currency?: Currency;
  printMethod?: PrintMethod;
}

export interface AdminProductDto {
  id: string;
  slug: string;
  category: ProductCategory;
  status: ProductStatus;
  name: LocalisedString;
  description: LocalisedString;
  supportedPrintMethods: PrintMethod[];
  imageUrls: string[];
  basePrice: Money;
  tags: string[];
  productionLeadDays: number;
  /** Optional SEO fields surfaced by the storefront product detail page. */
  seoTitle?: LocalisedString | null;
  seoDescription?: LocalisedString | null;
  /** Embedded children for convenient single-page editors. */
  variants: AdminProductVariantDto[];
  printAreas: AdminProductPrintAreaDto[];
  priceTiers: AdminProductPriceTierDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminProductInput {
  slug: string;
  category: ProductCategory;
  status?: ProductStatus;
  name: LocalisedString;
  description: LocalisedString;
  supportedPrintMethods: PrintMethod[];
  /** Either `imageUrls` (already uploaded) or `imageDataUrls` (server uploads
   * them via StorageProvider) — at least one must be supplied to publish. */
  imageUrls?: string[];
  imageDataUrls?: string[];
  basePriceMinor: number;
  currency?: Currency;
  tags?: string[];
  productionLeadDays?: number;
  seoTitle?: LocalisedString;
  seoDescription?: LocalisedString;
}

export interface UpdateAdminProductInput {
  slug?: string;
  category?: ProductCategory;
  status?: ProductStatus;
  name?: LocalisedString;
  description?: LocalisedString;
  supportedPrintMethods?: PrintMethod[];
  imageUrls?: string[];
  /** Append-mode upload: client sends data URLs, server stores + returns final URLs. */
  imageDataUrls?: string[];
  basePriceMinor?: number;
  currency?: Currency;
  tags?: string[];
  productionLeadDays?: number;
  seoTitle?: LocalisedString | null;
  seoDescription?: LocalisedString | null;
}

export interface UpsertVariantInput {
  productId: string;
  sku: string;
  attributes: Record<string, string>;
  unitPriceMinor: number;
  currency?: Currency;
  weightGrams?: number;
  isActive?: boolean;
}

export interface UpsertPrintAreaInput {
  productId: string;
  key: string;
  label: LocalisedString;
  widthPx: number;
  heightPx: number;
  mockupOffsetXPx: number;
  mockupOffsetYPx: number;
  allowedPrintMethods: PrintMethod[];
}

export interface UpsertPriceTierInput {
  productId: string;
  minQuantity: number;
  maxQuantity: number | null;
  unitPriceMinor: number;
  currency?: Currency;
  printMethod?: PrintMethod;
}
