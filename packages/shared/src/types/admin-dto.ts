import type { Locale } from '../constants/locales';
import type { AdminRole } from '../constants/roles';

import type { Money } from './common';

/**
 * Admin-side permissions. We use a flat string list rather than a tree so the
 * permission table can be authored declaratively in JSON / DB rows later.
 *
 * The `*` wildcard inside a namespace means "any action under this resource"
 * (e.g. `quotes.*` ⇒ read + write). The single-token wildcard `*` is reserved
 * for the platform-admin role.
 */
export const ADMIN_PERMISSIONS = [
  '*',
  'dashboard.read',
  'products.read',
  'products.write',
  'templates.read',
  'templates.write',
  'orders.read',
  'orders.write',
  'design-reviews.read',
  'design-reviews.write',
  'suppliers.read',
  'suppliers.write',
  'production-jobs.read',
  'production-jobs.write',
  'shipments.read',
  'shipments.write',
  'rfqs.read',
  'rfqs.write',
  'quotes.read',
  'quotes.write',
  'finance.read',
  'finance.write',
  'settings.read',
  'settings.write',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

/**
 * Default RBAC table. Roles list permissions explicitly so the rendering layer
 * stays page-agnostic; pages declare which permission they require, and menus
 * filter against `user.permissions`.
 */
export const ADMIN_ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  admin: ['*'],
  sales: [
    'dashboard.read',
    'orders.read',
    'rfqs.read',
    'rfqs.write',
    'quotes.read',
    'quotes.write',
    'products.read',
    'templates.read',
  ],
  designer: [
    'dashboard.read',
    'design-reviews.read',
    'design-reviews.write',
    'templates.read',
    'templates.write',
    'products.read',
  ],
  production_manager: [
    'dashboard.read',
    'orders.read',
    'production-jobs.read',
    'production-jobs.write',
    'shipments.read',
    'shipments.write',
    'suppliers.read',
    'design-reviews.read',
  ],
  finance: ['dashboard.read', 'orders.read', 'finance.read', 'finance.write', 'quotes.read'],
  supplier_user: [
    'dashboard.read',
    'production-jobs.read',
    'production-jobs.write',
    'shipments.read',
    'shipments.write',
  ],
};

/** Returns true when `permissions` grants the requested capability. */
export function hasAdminPermission(
  permissions: readonly AdminPermission[],
  required: AdminPermission,
): boolean {
  if (permissions.includes('*')) return true;
  if (permissions.includes(required)) return true;
  // Namespace wildcard, e.g. `production-jobs.*` matches `production-jobs.read`.
  const dot = required.indexOf('.');
  if (dot > 0) {
    const ns = `${required.slice(0, dot)}.*` as AdminPermission;
    return permissions.includes(ns);
  }
  return false;
}

/** Public-facing admin user DTO. Never exposes `passwordHash`. */
export interface AdminUserDto {
  id: string;
  email: string;
  fullName: string;
  role: AdminRole;
  /** Resolved at login time from the role table — the UI never recomputes it. */
  permissions: AdminPermission[];
  locale: Locale;
  avatarUrl?: string | null;
  /** When `role === 'supplier_user'`, links the account to a supplier record so
   *  the supplier portal can scope all reads/writes to that supplier's jobs. */
  supplierId?: string | null;
  createdAt: string;
}

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  user: AdminUserDto;
}

/** GET /admin/dashboard. */
export interface AdminDashboardSnapshot {
  ordersToday: number;
  gmvToday: Money;
  designsPendingReview: number;
  ordersPendingProduction: number;
  ordersInProduction: number;
  ordersPendingShipment: number;
  ordersExceptions: number;
  rfqsOpen: number;
  generatedAt: string;
}
