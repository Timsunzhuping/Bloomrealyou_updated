import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { AppendAuditLogInput, AuditLogDto } from '@custom-merch/shared';

import { tryPersistAuditLog } from './audit-logs.prisma-sink';

/**
 * Append-only in-memory audit log. Mirrors the shape of the future
 * `audit_logs` table — every back-office mutation hits this so
 * `who-did-what-when` is always reconstructable.
 *
 * When `DATABASE_URL` is set the sink dual-writes each entry to the Prisma
 * `audit_logs` table; failures are logged but never block the request.
 */
@Injectable()
export class AuditLogsRepository {
  private readonly entries: AuditLogDto[] = [];

  append(input: AppendAuditLogInput): AuditLogDto {
    const entry: AuditLogDto = {
      id: randomUUID(),
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      actorRole: input.actorRole ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      before: input.before ?? null,
      after: input.after ?? null,
      payload: input.payload ?? null,
      summary: input.summary ?? null,
      occurredAt: new Date().toISOString(),
    };
    this.entries.push(entry);
    tryPersistAuditLog(entry);
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
