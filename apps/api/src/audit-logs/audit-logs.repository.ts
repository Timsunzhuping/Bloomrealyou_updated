import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AppendAuditLogInput, AuditLogDto } from '@custom-merch/shared';

/**
 * Append-only in-memory audit log. Mirrors the shape of the future
 * `audit_logs` table — every back-office mutation hits this so
 * `who-did-what-when` is always reconstructable.
 */
@Injectable()
export class AuditLogsRepository {
  private readonly entries: AuditLogDto[] = [];

  append(input: AppendAuditLogInput): AuditLogDto {
    const entry: AuditLogDto = {
      id: randomUUID(),
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      payload: input.payload ?? null,
      summary: input.summary ?? null,
      occurredAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    return entry;
  }

  /** Newest-first listing, optionally scoped to a single entity. */
  list(filter?: { entityType?: string; entityId?: string }): AuditLogDto[] {
    let rows = this.entries;
    if (filter?.entityType) rows = rows.filter((r) => r.entityType === filter.entityType);
    if (filter?.entityId) rows = rows.filter((r) => r.entityId === filter.entityId);
    return [...rows].reverse();
  }
}
