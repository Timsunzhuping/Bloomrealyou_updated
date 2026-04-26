/**
 * Centralised state-machine vocabularies. Modules MUST import their statuses
 * from this file rather than redefining their own; this keeps DB enums,
 * API payloads, and UI badges in lockstep.
 */

export const PRODUCT_STATUSES = ['draft', 'active', 'archived', 'discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const DESIGN_STATUSES = ['draft', 'submitted', 'approved', 'rejected'] as const;
export type DesignStatus = (typeof DESIGN_STATUSES)[number];

export const CART_STATUSES = ['active', 'abandoned', 'converted', 'expired'] as const;
export type CartStatus = (typeof CART_STATUSES)[number];

export const ORDER_STATUSES = [
  'pending',
  'pending_payment',
  'paid',
  'design_review',
  'design_approved',
  'production_assigned',
  'in_production',
  'quality_inspection',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'refunded',
  'exception',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  'pending',
  'authorized',
  'succeeded',
  'failed',
  'refunded',
  'partially_refunded',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PRODUCTION_JOB_STATUSES = [
  'queued',
  'assigned',
  'in_progress',
  'quality_check',
  'completed',
  'failed',
] as const;
export type ProductionJobStatus = (typeof PRODUCTION_JOB_STATUSES)[number];

export const SHIPMENT_STATUSES = [
  'pending',
  'label_created',
  'in_transit',
  'out_for_delivery',
  'delivered',
  'returned',
  'failed',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const RFQ_STATUSES = [
  'submitted',
  'under_review',
  'quoted',
  'won',
  'lost',
  'expired',
  'cancelled',
] as const;
export type RFQStatus = (typeof RFQ_STATUSES)[number];

export const QUOTE_STATUSES = [
  'draft',
  'sent',
  'accepted',
  'rejected',
  'expired',
  'revised',
] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const SUPPLIER_STATUSES = ['active', 'inactive', 'suspended', 'onboarding'] as const;
export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export const NOTIFICATION_STATUSES = [
  'pending',
  'sent',
  'delivered',
  'failed',
  'bounced',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];
