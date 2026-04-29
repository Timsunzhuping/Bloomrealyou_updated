import type { Brand, IsoDateString } from './common';
import type { UserId } from './user';

export type AuditLogId = Brand<string, 'AuditLogId'>;

/** Logical action verbs used in audit entries. Extend cautiously — keep them stable. */
export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'soft_delete'
  | 'restore'
  | 'login'
  | 'login_failed'
  | 'logout'
  | 'role_change'
  | 'status_change'
  | 'export'
  | 'approve'
  | 'reject'
  | 'assign'
  | 'refund';

/**
 * Append-only audit record. Every back-office mutation MUST emit one of these
 * (see WP-02 audit middleware) so we can reconstruct who-did-what-when.
 */
export interface AuditLog {
  id: AuditLogId;
  /** Actor user; null for system-initiated actions. */
  actorUserId?: UserId | null;
  /** IP address captured at the request edge. */
  actorIp?: string;
  /** Logical entity name, e.g. 'Order', 'Product', 'Supplier'. */
  entityType: string;
  /** Primary key of the affected entity, stringified. */
  entityId: string;
  action: AuditAction;
  /** Diff or context payload. Keep below ~16KB; large blobs go to object storage. */
  payload?: Record<string, unknown>;
  /** Human-readable summary suitable for the back-office activity feed. */
  summary?: string;
  occurredAt: IsoDateString;
}
