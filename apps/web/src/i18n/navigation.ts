import { createNavigation } from 'next-intl/navigation';

import { routing } from './routing';

/**
 * Locale-aware Link / redirect / router primitives. Apps should always import
 * navigation helpers from this module rather than `next/link` directly so the
 * locale segment is preserved automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
