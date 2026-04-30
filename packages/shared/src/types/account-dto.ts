/**
 * Account-area wire-format DTOs. The MVP uses an anonymous-session model
 * (the cart session id doubles as the user id) so both server and client
 * read profile / addresses scoped by session.
 */
import type { Locale } from '../constants/locales';
import type { OrderStatus, PaymentStatus } from '../constants/statuses';

import type { Address } from './common';

export interface AccountProfileDto {
  id: string;
  email: string | null;
  fullName: string | null;
  phone: string | null;
  locale: Locale;
  marketingOptIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateAccountProfileInput {
  email?: string;
  fullName?: string;
  phone?: string;
  locale?: Locale;
  marketingOptIn?: boolean;
}

export interface SavedAddressDto extends Address {
  id: string;
  label: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAddressInput {
  label?: string | null;
  fullName: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
}

/**
 * Logical milestones surfaced on the order detail timeline.
 * The status field maps a milestone to the underlying OrderStatus values
 * that satisfy it.
 */
export type OrderTimelineKey =
  | 'placed'
  | 'payment_confirmed'
  | 'design_review'
  | 'in_production'
  | 'shipped'
  | 'delivered';

export interface OrderTimelineEvent {
  key: OrderTimelineKey;
  /** Default English label. Front-end maps to i18n by `key`. */
  label: string;
  state: 'completed' | 'current' | 'upcoming';
  /** ISO timestamp when the milestone was reached, when known. */
  occurredAt?: string | null;
}

/** Convenience read shape returned by /account/orders/:n. */
export interface AccountOrderDetailDto {
  /** Mirrors OrderDto exactly + adds the derived timeline. */
  order: import('./order-dto').OrderDto;
  /** Most recent payment status. */
  paymentStatus: PaymentStatus | null;
  /** Logical timeline mapped from OrderStatus history. */
  timeline: OrderTimelineEvent[];
  /** Optional carrier tracking; populated when ShipmentService records exist. */
  trackingNumber: string | null;
  trackingUrl: string | null;
}

export interface ReorderInput {
  /** Optional shipping country override for the new cart line. */
  shippingCountry?: string;
  rush?: boolean;
}

/** Read-only quote summary used in the account quotes tab (placeholder). */
export interface AccountQuoteSummaryDto {
  id: string;
  quoteNumber: string;
  rfqNumber?: string | null;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'revised';
  /** Pre-formatted total (caller supplies the currency). */
  total: { amountMinor: number; currency: string };
  validUntil?: string | null;
  createdAt: string;
}

/** Mirrors a subset of OrderStatus -> human label. */
export const ORDER_STATUS_TO_TIMELINE: Record<OrderStatus, OrderTimelineKey | null> = {
  pending: 'placed',
  pending_payment: 'placed',
  paid: 'payment_confirmed',
  design_review: 'design_review',
  design_approved: 'design_review',
  production_assigned: 'in_production',
  in_production: 'in_production',
  quality_inspection: 'in_production',
  shipped: 'shipped',
  delivered: 'delivered',
  completed: 'delivered',
  cancelled: null,
  refunded: null,
  exception: null,
};
