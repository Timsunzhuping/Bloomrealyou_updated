import { Logger } from '@nestjs/common';

const log = new Logger('PrismaSink');

/**
 * Loose typing for the Prisma client. The real generated types differ across
 * models (each accessor returns a model-specific delegate); the sink callers
 * only ever invoke `upsert / create / delete` and care about *failures*
 * being silenced, so we use a permissive `any` shape here. The official
 * client is consumed unchanged — only the sink wrapper is typed loose.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any;

let cachedClient: PrismaLike | null | undefined; // undefined = not yet probed

/**
 * Lazy, single-shot probe of `@custom-merch/db`. Returns the client when
 * `DATABASE_URL` is set AND the package resolves, otherwise null. The probe
 * runs once per process — subsequent calls return the cached value (or null).
 */
async function loadPrismaClient(): Promise<PrismaLike | null> {
  if (cachedClient !== undefined) return cachedClient;
  if (!process.env.DATABASE_URL) {
    cachedClient = null;
    log.log('DATABASE_URL not set — Prisma sinks degrade to in-memory only');
    return null;
  }
  try {
    const mod = (await import('@custom-merch/db')) as unknown as {
      getPrismaClient: () => PrismaLike;
    };
    cachedClient = mod.getPrismaClient();
    log.log('Prisma sinks ready');
    return cachedClient;
  } catch (e) {
    log.warn(`Prisma sinks unavailable (${(e as Error).message}); falling back to in-memory`);
    cachedClient = null;
    return null;
  }
}

/**
 * Fire-and-forget runner for a Prisma operation. Intended for repository
 * dual-writes: the in-memory store is the source of truth; this hook keeps
 * the relational store warm when configured. Errors are logged once and
 * never thrown so request handlers always complete.
 *
 * @param label  Human-readable context for the warning logs (e.g. `supplier`).
 * @param fn     Operation to run on the client. Receives the typed-as-any client.
 */
export function runIfPrismaAvailable(
  label: string,
  fn: (client: PrismaLike) => Promise<unknown>,
): void {
  void (async (): Promise<void> => {
    const client = await loadPrismaClient();
    if (!client) return;
    try {
      await fn(client);
    } catch (e) {
      log.warn(`Prisma sink failed for ${label}: ${(e as Error).message}`);
    }
  })();
}

/** Test helper — drops the cached client so a future call re-probes. */
export function __resetPrismaSinkForTests(): void {
  cachedClient = undefined;
}
