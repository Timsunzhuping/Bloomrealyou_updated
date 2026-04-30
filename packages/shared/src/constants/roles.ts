/**
 * Admin-side roles used to gate operations in the back-office.
 *
 * Storefront customers are represented by the separate `customer` role
 * (see {@link USER_ROLES}). Suppliers log into a constrained portal under
 * `supplier_user`.
 */
export const ADMIN_ROLES = [
  'admin',
  'sales',
  'designer',
  'production_manager',
  'finance',
  'supplier_user',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * All user roles understood by the platform. `customer` represents
 * storefront end-users; the remaining roles are admin-side.
 */
export const USER_ROLES = ['customer', ...ADMIN_ROLES] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Returns true if the role grants any back-office access. */
export const isAdminRole = (role: UserRole): role is AdminRole =>
  (ADMIN_ROLES as readonly string[]).includes(role);
