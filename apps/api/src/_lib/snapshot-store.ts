import { Injectable, Logger } from '@nestjs/common';

import { readIfPrismaAvailable, runIfPrismaAvailable } from './prisma-sink';

/**
 * A single durable snapshot row, as returned by {@link SnapshotStore.loadAll}.
 */
export interface SnapshotRow<T> {
  entityId: string;
  refKey: string | null;
  data: T;
}

/**
 * Durable JSON snapshot store backing the in-memory aggregate repositories
 * (orders, payments, carts, designs, quotes, RFQs, accounts, ...).
 *
 * Backed by the `entity_snapshots` table (see the Prisma schema). Each
 * repository:
 *   1. primes its in-memory map at boot via {@link loadAll}
 *   2. write-throughs every mutation via {@link put} / {@link remove}
 *
 * All DB access goes through the {@link prisma-sink} helpers, so:
 *   - the Prisma client is typed loosely (`any`) — no dependency on the
 *     regenerated client types at compile time
 *   - writes are fire-and-forget — a DB outage never blocks a request
 *   - when `DATABASE_URL` is unset the store silently degrades to a no-op and
 *     the repositories run purely in-memory (dev / CI behaviour)
 *
 * The source of truth at runtime stays the in-memory map; this layer makes
 * that map durable across restarts and shareable across instances.
 */
@Injectable()
export class SnapshotStore {
  private readonly log = new Logger(SnapshotStore.name);

  /**
   * Load every snapshot of a given `kind`. Returns `[]` when Prisma is
   * unavailable (the repository then starts with an empty in-memory map).
   */
  async loadAll<T>(kind: string): Promise<SnapshotRow<T>[]> {
    const rows = await readIfPrismaAvailable(`snapshot-load:${kind}`, (client) =>
      client.entitySnapshot.findMany({ where: { kind } }),
    );
    if (!rows) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (rows as any[]).map((r) => ({
      entityId: r.entityId as string,
      refKey: (r.refKey ?? null) as string | null,
      data: r.data as T,
    }));
  }

  /**
   * Write-through upsert of one snapshot. Fire-and-forget — returns
   * immediately; the DB write happens asynchronously and failures are logged,
   * not thrown.
   *
   * @param kind     Aggregate type, e.g. `"order"`.
   * @param entityId The aggregate's own id.
   * @param data     The full DTO payload (stored as JSON).
   * @param refKey   Optional secondary lookup key (orderNumber, email, ...).
   */
  put<T>(kind: string, entityId: string, data: T, refKey?: string | null): void {
    runIfPrismaAvailable(`snapshot-put:${kind}`, (client) =>
      client.entitySnapshot.upsert({
        where: { kind_entityId: { kind, entityId } },
        update: { data: data as unknown, refKey: refKey ?? null },
        create: { kind, entityId, refKey: refKey ?? null, data: data as unknown },
      }),
    );
  }

  /**
   * Delete one snapshot (fire-and-forget). A missing row is not an error.
   */
  remove(kind: string, entityId: string): void {
    runIfPrismaAvailable(`snapshot-remove:${kind}`, async (client) => {
      try {
        await client.entitySnapshot.delete({ where: { kind_entityId: { kind, entityId } } });
      } catch {
        // Row may not exist — that's fine for a delete.
      }
    });
  }
}
