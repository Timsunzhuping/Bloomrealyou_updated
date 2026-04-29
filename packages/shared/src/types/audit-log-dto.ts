import type { AdminRole } from '../constants/roles';

import type { AuditAction } from './audit';

/** Wire shape used by the audit log API. Keeps the entity stringly-typed so
 *  any module can append entries without coupling to its enum. */
export interface AuditLogDto {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  /** Role the actor held when the action ran. Snapshotted to survive
   *  later RBAC changes. */
  actorRole: AdminRole | null;
  /** Originating IP address, when the request carries one. */
  ipAddress: string | null;
  /** Raw User-Agent header, when available. */
  userAgent: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  /** State snapshot before the mutation. */
  before: Record<string, unknown> | null;
  /** State snapshot after the mutation. */
  after: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  summary: string | null;
  occurredAt: string;
}

export interface AppendAuditLogInput {
  actorUserId?: string | null;
  actorName?: string | null;
  actorRole?: AdminRole | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  summary?: string;
}
