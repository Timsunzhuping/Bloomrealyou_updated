import { Logger } from '@nestjs/common';

import type { AuditAction, AuditLogDto } from '@custom-merch/shared';

const log = new Logger('AuditLogPrismaSink');

/**
 * Optional Prisma sink for audit logs.
 *
 * The platform's MVP repos are in-memory; durability is bolted on by writing
 * each audit entry to the `audit_logs` table when `DATABASE_URL` is set and
 * `@custom-merch/db` resolves at runtime. Failures degrade silently — the
 * in-memory list stays the source of truth for the running process, and a
 * later WP can switch primary storage to Prisma without changing callers.
 */

let cachedClient: PrismaLike | null | undefined; // undefined = not yet probed

interface PrismaLike {
  auditLog: {
    create(args: {
      data: {
        id?: string;
        actorUserId?: string | null;
        actorIp?: string | null;
        entityType: string;
        entityId: string;
        action: AuditAction;
        before?: unknown;
        after?: unknown;
        metadata?: unknown;
        summary?: string | null;
        occurredAt: Date;
      };
    }): Promise<unknown>;
  };
}

async function loadClient(): Promise<PrismaLike | null> {
  if (cachedClient !== undefined) return cachedClient;
  if (!process.env.DATABASE_URL) {
    cachedClient = null;
    log.log('DATABASE_URL not set — audit logs are in-memory only');
    return null;
  }
  try {
    // Cast through `unknown` so the dynamic import doesn't fight Prisma's
    // generated argument types. We only ever call a tiny subset.
    const mod = (await import('@custom-merch/db')) as unknown as {
      getPrismaClient: () => PrismaLike;
    };
    cachedClient = mod.getPrismaClient();
    log.log('Prisma audit-log sink ready');
    return cachedClient;
  } catch (e) {
    log.warn(`Prisma sink unavailable (${(e as Error).message}); falling back to in-memory`);
    cachedClient = null;
    return null;
  }
}

/**
 * Best-effort persist of an audit entry. Returns immediately — callers should
 * not await. Errors are logged once per call but never thrown so the request
 * cycle continues to complete on the in-memory store.
 */
export function tryPersistAuditLog(entry: AuditLogDto): void {
  void (async (): Promise<void> => {
    const client = await loadClient();
    if (!client) return;
    try {
      await client.auditLog.create({
        data: {
          id: entry.id,
          actorUserId: entry.actorUserId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          metadata: entry.payload ?? undefined,
          summary: entry.summary ?? undefined,
          occurredAt: new Date(entry.occurredAt),
        },
      });
    } catch (e) {
      log.warn(`Audit log persist failed for ${entry.entityType}/${entry.entityId}: ${(e as Error).message}`);
    }
  })();
}

/** Test helper — clears the cached client so a fresh probe runs on next call. */
export function __resetAuditLogPrismaSinkForTests(): void {
  cachedClient = undefined;
}
