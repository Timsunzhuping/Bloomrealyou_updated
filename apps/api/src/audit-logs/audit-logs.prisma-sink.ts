import type { AuditLogDto } from '@custom-merch/shared';

import { runIfPrismaAvailable } from '../_lib/prisma-sink';

/**
 * Optional Prisma sink for audit logs.
 *
 * The platform's MVP repos are in-memory; durability is bolted on by writing
 * each audit entry to the `audit_logs` table when `DATABASE_URL` is set. Any
 * failure (missing table, unparseable id, etc.) is logged once and the request
 * cycle continues — the in-memory list stays the source of truth.
 */
export function tryPersistAuditLog(entry: AuditLogDto): void {
  runIfPrismaAvailable('auditLog', (client) =>
    client.auditLog.create({
      data: {
        id: entry.id,
        actorUserId: entry.actorUserId,
        actorRole: entry.actorRole ?? undefined,
        actorIp: entry.ipAddress ?? undefined,
        userAgent: entry.userAgent ?? undefined,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        before: entry.before ?? undefined,
        after: entry.after ?? undefined,
        metadata: entry.payload ?? undefined,
        summary: entry.summary ?? undefined,
        occurredAt: new Date(entry.occurredAt),
      },
    }),
  );
}
