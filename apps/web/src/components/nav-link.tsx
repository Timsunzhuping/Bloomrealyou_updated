import * as React from 'react';

import { Link } from '@/i18n/navigation';

/**
 * Wrap any node with a locale-aware <Link>. Used as a `renderLink` slot for
 * UI components that need a router-aware anchor (Footer, Breadcrumb, etc.).
 */
export function localeLink(href: string, children: React.ReactNode): React.ReactNode {
  return <Link href={href}>{children}</Link>;
}
