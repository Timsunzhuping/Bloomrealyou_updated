import type { PrintMethod } from '../constants/print-methods';
import type { SupplierStatus } from '../constants/statuses';

import type { Address, Brand, Money, Timestamps } from './common';
import type { ProductId, ProductVariantId } from './product';

export type SupplierId = Brand<string, 'SupplierId'>;
export type SupplierProductMappingId = Brand<string, 'SupplierProductMappingId'>;

export interface Supplier extends Timestamps {
  id: SupplierId;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  status: SupplierStatus;
  /** Print methods this supplier can fulfil. */
  capabilities: PrintMethod[];
  /** Geographic region the supplier ships from (ISO country code). */
  countryCode: string;
  address?: Address;
  /** Average production lead time in business days for blank → finished good. */
  avgLeadDays: number;
  /** Quality score 0..100 (rolling window) used by the matching engine. */
  qualityScore?: number;
  /** Internal notes; not exposed to customers. */
  notes?: string;
}

/**
 * Mapping between a supplier and a product variant they can produce.
 * Drives the supplier-matching logic for production jobs.
 */
export interface SupplierProductMapping extends Timestamps {
  id: SupplierProductMappingId;
  supplierId: SupplierId;
  productId: ProductId;
  variantId?: ProductVariantId;
  printMethod: PrintMethod;
  /** Per-unit cost charged by the supplier (excl. shipping). */
  unitCost: Money;
  /** Minimum order quantity the supplier accepts for this mapping. */
  minOrderQuantity: number;
  /** Maximum daily throughput; used by the planner. */
  dailyCapacity?: number;
  /** Override of supplier-default lead time, when this product is faster/slower. */
  leadDays?: number;
  isActive: boolean;
}
