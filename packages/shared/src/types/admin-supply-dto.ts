/**
 * Admin-facing wire formats for the WP-15 supply-chain modules: suppliers,
 * supplier ↔ product mappings, production jobs, shipments. The fields mirror
 * the WP-15 spec exactly so the admin forms drop in directly.
 */
import type { Currency } from '../constants/currencies';
import type { PrintMethod } from '../constants/print-methods';
import type { ProductCategory } from '../constants/product-categories';
import type {
  ProductionJobStatus,
  ShipmentStatus,
  SupplierStatus,
} from '../constants/statuses';

import type { Address, IsoDateString, Money } from './common';

// ── suppliers ───────────────────────────────────────────────────────────

export interface AdminSupplierDto {
  id: string;
  name: string;
  country: string;
  region?: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone?: string | null;
  supportedCategories: ProductCategory[];
  supportedPrintMethods: PrintMethod[];
  /** Lower bound (per item) for any quote against this supplier. */
  minOrderQuantity: number;
  averageProductionDays: number;
  /** 0–100. */
  qualityScore: number;
  /** 0–1 (e.g. 0.95). */
  onTimeRate: number;
  /** 0–1. */
  returnRate: number;
  supportsWhiteLabel: boolean;
  supportsSample: boolean;
  status: SupplierStatus;
  notes?: string | null;
  address?: Address | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateAdminSupplierInput {
  name: string;
  country: string;
  region?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  supportedCategories: ProductCategory[];
  supportedPrintMethods: PrintMethod[];
  minOrderQuantity: number;
  averageProductionDays: number;
  qualityScore?: number;
  onTimeRate?: number;
  returnRate?: number;
  supportsWhiteLabel?: boolean;
  supportsSample?: boolean;
  status?: SupplierStatus;
  notes?: string;
}

export interface UpdateAdminSupplierInput {
  name?: string;
  country?: string;
  region?: string | null;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string | null;
  supportedCategories?: ProductCategory[];
  supportedPrintMethods?: PrintMethod[];
  minOrderQuantity?: number;
  averageProductionDays?: number;
  qualityScore?: number;
  onTimeRate?: number;
  returnRate?: number;
  supportsWhiteLabel?: boolean;
  supportsSample?: boolean;
  status?: SupplierStatus;
  notes?: string | null;
}

// ── supplier ↔ product mappings ─────────────────────────────────────────

export type SupplierMappingStatus = 'active' | 'paused' | 'inactive';

export interface AdminSupplierProductMappingDto {
  id: string;
  supplierId: string;
  productId: string;
  variantId?: string | null;
  supplierSku: string;
  costPrice: Money;
  productionDays: number;
  minOrderQuantity: number;
  maxDailyCapacity: number;
  printMethods: PrintMethod[];
  status: SupplierMappingStatus;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateAdminMappingInput {
  supplierId: string;
  productId: string;
  variantId?: string;
  supplierSku: string;
  costPriceMinor: number;
  currency?: Currency;
  productionDays: number;
  minOrderQuantity: number;
  maxDailyCapacity: number;
  printMethods: PrintMethod[];
  status?: SupplierMappingStatus;
}

export interface UpdateAdminMappingInput {
  supplierSku?: string;
  costPriceMinor?: number;
  currency?: Currency;
  productionDays?: number;
  minOrderQuantity?: number;
  maxDailyCapacity?: number;
  printMethods?: PrintMethod[];
  status?: SupplierMappingStatus;
}

// ── supplier recommendation ─────────────────────────────────────────────

export interface SupplierRecommendInput {
  productId: string;
  variantId?: string;
  category: ProductCategory;
  printMethod: PrintMethod;
  quantity: number;
  destinationCountry: string;
  /** Soft cap on cost per unit (in minor units of `currency`). */
  budgetUnitPriceMinor?: number;
  currency?: Currency;
  /** When true, only suppliers with `supportsWhiteLabel === true` qualify. */
  requireWhiteLabel?: boolean;
}

export interface SupplierRecommendation {
  supplierId: string;
  supplierName: string;
  /** 0–100, higher is better. */
  score: number;
  /** Short, English-readable bullets — UI may translate via `reasonCodes`. */
  reasons: string[];
  /** Stable codes the UI can localise (e.g. `bestCost`, `dtgCapability`). */
  reasonCodes: string[];
  estimatedUnitCostMinor: number;
  estimatedTotalCostMinor: number;
  estimatedProductionDays: number;
  currency: Currency;
}

export interface SupplierRecommendResponse {
  recommendations: SupplierRecommendation[];
  unmatchedSupplierCount: number;
}

// ── production jobs ─────────────────────────────────────────────────────

export interface ProductionJobAttachment {
  id: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedAt: IsoDateString;
  /** Free-form note accompanying the upload. */
  note?: string | null;
}

export interface ProductionJobNote {
  id: string;
  authorUserId: string;
  authorName: string;
  body: string;
  createdAt: IsoDateString;
}

export interface AdminProductionJobDto {
  id: string;
  jobNumber: string;
  orderId: string;
  orderNumber: string;
  orderItemIds: string[];
  supplierId?: string | null;
  supplierName?: string | null;
  productId?: string | null;
  variantId?: string | null;
  printMethod: PrintMethod;
  quantity: number;
  status: ProductionJobStatus;
  supplierCost?: Money | null;
  expectedReadyAt?: IsoDateString | null;
  startedAt?: IsoDateString | null;
  completedAt?: IsoDateString | null;
  qcNotes?: string | null;
  qcAttachments: ProductionJobAttachment[];
  failureReason?: string | null;
  internalNotes: ProductionJobNote[];
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateProductionJobInput {
  orderId: string;
  orderItemIds: string[];
  printMethod: PrintMethod;
  quantity: number;
  supplierId?: string;
}

export interface UpdateProductionJobStatusInput {
  status: ProductionJobStatus;
  note?: string;
  failureReason?: string;
}

export interface AssignProductionSupplierInput {
  supplierId: string;
  unitCostMinor?: number;
  currency?: Currency;
  expectedReadyAt?: IsoDateString;
}

export interface UploadQcResultInput {
  passed: boolean;
  notes?: string;
  attachmentDataUrl?: string;
  attachmentFileName?: string;
  /** When passed=false, the failure reason that customers see. */
  failureReason?: string;
}

// ── shipments ───────────────────────────────────────────────────────────

export type ShippingMethod = 'standard' | 'express' | 'rush';

export interface AdminShipmentDto {
  id: string;
  shipmentNumber: string;
  orderId: string;
  orderNumber: string;
  productionJobIds: string[];
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingMethod?: ShippingMethod;
  shippingCost?: Money | null;
  status: ShipmentStatus;
  shippedAt?: IsoDateString | null;
  estimatedDeliveryAt?: IsoDateString | null;
  deliveredAt?: IsoDateString | null;
  packageWeightGrams?: number | null;
  notes?: string | null;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface CreateShipmentInput {
  orderId: string;
  productionJobIds?: string[];
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  shippingMethod?: ShippingMethod;
  shippingCostMinor?: number;
  currency?: Currency;
  estimatedDeliveryAt?: IsoDateString;
  packageWeightGrams?: number;
  notes?: string;
  status?: ShipmentStatus;
}

export interface UpdateShipmentInput {
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingMethod?: ShippingMethod;
  shippingCostMinor?: number;
  currency?: Currency;
  estimatedDeliveryAt?: IsoDateString | null;
  deliveredAt?: IsoDateString | null;
  shippedAt?: IsoDateString | null;
  packageWeightGrams?: number | null;
  notes?: string | null;
  status?: ShipmentStatus;
}

// ── customer-facing tracking ────────────────────────────────────────────

/** Public-safe summary used by `GET /orders/:orderNumber/tracking`. Strips
 *  internal admin-only context so customers never see supplier names or
 *  internal notes. */
export interface PublicShipmentDto {
  shipmentNumber: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingMethod?: ShippingMethod;
  status: ShipmentStatus;
  shippedAt?: IsoDateString | null;
  estimatedDeliveryAt?: IsoDateString | null;
  deliveredAt?: IsoDateString | null;
}

export interface OrderTrackingDto {
  orderNumber: string;
  orderStatus: string;
  shipments: PublicShipmentDto[];
  lastUpdatedAt: IsoDateString;
}
