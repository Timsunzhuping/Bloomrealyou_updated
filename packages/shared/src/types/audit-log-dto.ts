import type { AuditAction } from './audit';

/** Wire shape used by the audit log API. Keeps the entity stringly-typed so
 *  any module can append entries without coupling to its enum. */
export interface AuditLogDto {
  id: string;
  actorUserId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  payload: Record<string, unknown> | null;
  summary: string | null;
  occurredAt: string;
}

export interface AppendAuditLogInput {
  actorUserId?: string | null;
  actorName?: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  payload?: Record<string, unknown>;
  summary?: string;
}
