import {
  hasAdminPermission,
  type AdminPermission,
  type AdminRole,
  type AdminUserDto,
} from '@custom-merch/shared';

export interface AdminMenuItem {
  /** Path under the locale prefix, e.g. `/dashboard`. */
  href: string;
  /** Translation key under `admin.nav.*`. */
  labelKey: string;
  /** RBAC gate — items with permissions the user lacks are hidden. */
  permission: AdminPermission;
  /** Optional role allow-list. When set, only listed roles see the item even
   *  if their permissions would otherwise grant access. */
  roles?: AdminRole[];
  /** lucide-react icon name. The shell maps this to the actual component. */
  icon:
    | 'gauge'
    | 'package'
    | 'palette'
    | 'shopping-bag'
    | 'sparkles'
    | 'truck'
    | 'factory'
    | 'users'
    | 'file-text'
    | 'receipt'
    | 'settings';
}

export interface AdminMenuGroup {
  /** Translation key under `admin.navGroups.*`. */
  labelKey: string;
  items: AdminMenuItem[];
}

/**
 * Single source of truth for the back-office sidebar. Groups + items are
 * declarative so RBAC filtering happens in one place — pages never know
 * which permission the user has, they're either reachable from the menu or
 * their data fetch fails server-side.
 */
export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  {
    labelKey: 'overview',
    items: [
      { href: '/dashboard', labelKey: 'dashboard', permission: 'dashboard.read', icon: 'gauge' },
    ],
  },
  {
    labelKey: 'commerce',
    items: [
      { href: '/products', labelKey: 'products', permission: 'products.read', icon: 'package' },
      { href: '/templates', labelKey: 'templates', permission: 'templates.read', icon: 'palette' },
      { href: '/orders', labelKey: 'orders', permission: 'orders.read', icon: 'shopping-bag' },
      {
        href: '/design-reviews',
        labelKey: 'designReviews',
        permission: 'design-reviews.read',
        icon: 'sparkles',
      },
    ],
  },
  {
    labelKey: 'production',
    items: [
      { href: '/suppliers', labelKey: 'suppliers', permission: 'suppliers.read', icon: 'users' },
      {
        href: '/production-jobs',
        labelKey: 'productionJobs',
        permission: 'production-jobs.read',
        icon: 'factory',
      },
      { href: '/shipments', labelKey: 'shipments', permission: 'shipments.read', icon: 'truck' },
    ],
  },
  {
    labelKey: 'salesOps',
    items: [
      { href: '/rfqs', labelKey: 'rfqs', permission: 'rfqs.read', icon: 'file-text' },
      { href: '/quotes', labelKey: 'quotes', permission: 'quotes.read', icon: 'receipt' },
    ],
  },
  {
    labelKey: 'supplier',
    items: [
      {
        href: '/supplier-portal',
        labelKey: 'supplierPortal',
        permission: 'production-jobs.read',
        roles: ['supplier_user'],
        icon: 'factory',
      },
    ],
  },
  {
    labelKey: 'system',
    items: [
      { href: '/settings', labelKey: 'settings', permission: 'settings.read', icon: 'settings' },
    ],
  },
];

/** Filter the menu config against the current user's permissions and role. */
export function visibleMenuGroups(user: AdminUserDto | null): AdminMenuGroup[] {
  if (!user) return [];
  return ADMIN_MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          hasAdminPermission(user.permissions, item.permission) &&
          (!item.roles || item.roles.includes(user.role)),
      ),
    }))
    .filter((group) => group.items.length > 0);
}

/** Resolve the active menu item for a given pathname (locale-stripped). */
export function findActiveMenuItem(path: string): AdminMenuItem | null {
  for (const group of ADMIN_MENU_GROUPS) {
    for (const item of group.items) {
      if (path === item.href || path.startsWith(`${item.href}/`)) return item;
    }
  }
  return null;
}
