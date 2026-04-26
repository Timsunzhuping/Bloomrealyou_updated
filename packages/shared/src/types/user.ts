import type { Locale } from '../constants/locales';
import type { UserRole } from '../constants/roles';

import type { Address, Brand, IsoDateString, SoftDeletable, Timestamps } from './common';

export type UserId = Brand<string, 'UserId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;

/** Storefront customer or back-office staff member. */
export interface User extends Timestamps, SoftDeletable {
  id: UserId;
  email: string;
  emailVerifiedAt?: IsoDateString | null;
  passwordHash?: string | null;
  fullName: string;
  phone?: string;
  locale: Locale;
  role: UserRole;
  /** Set when the user belongs to a corporate buyer organization. */
  organizationId?: OrganizationId | null;
  defaultShippingAddress?: Address;
  defaultBillingAddress?: Address;
  lastLoginAt?: IsoDateString | null;
  isActive: boolean;
}

/** Corporate buyer (B2B). Customers can belong to one organization. */
export interface Organization extends Timestamps, SoftDeletable {
  id: OrganizationId;
  name: string;
  legalName?: string;
  taxId?: string;
  website?: string;
  industry?: string;
  /** Account manager (admin/sales user) responsible for this org. */
  accountManagerId?: UserId | null;
  /** Approved net-payment terms in days, e.g. 30 / 60. */
  netPaymentTermsDays?: number;
  defaultBillingAddress?: Address;
  defaultShippingAddress?: Address;
  notes?: string;
  isActive: boolean;
}
