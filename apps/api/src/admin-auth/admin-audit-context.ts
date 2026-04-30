import type { AdminRole } from '@custom-merch/shared';

import { ADMIN_AUDIT_CONTEXT_KEY } from './admin-auth.tokens';

/**
 * Audit-relevant details about an authenticated request. Populated by
 * {@link AdminBearerGuard} so any service can include the actor's role +
 * IP + user-agent in `audit_logs` without re-reading the request itself.
 *
 * Use {@link readAuditContext} from controllers — the guard guarantees a
 * value is present, but callers should treat each field as nullable so
 * non-guarded entry points (e.g. test harnesses, supplier portal) still work.
 */
export interface AdminAuditContext {
  actorUserId: string | null;
  actorName: string | null;
  actorRole: AdminRole | null;
  ipAddress: string | null;
  userAgent: string | null;
}

const EMPTY: AdminAuditContext = {
  actorUserId: null,
  actorName: null,
  actorRole: null,
  ipAddress: null,
  userAgent: null,
};

export function readAuditContext(req: {
  [key: string]: unknown;
}): AdminAuditContext {
  const value = req[ADMIN_AUDIT_CONTEXT_KEY];
  if (value && typeof value === 'object') return value as AdminAuditContext;
  return EMPTY;
}
