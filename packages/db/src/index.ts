/**
 * Typed Prisma client singleton for the platform.
 *
 * Apps/api (and anyone else needing direct DB access) imports the shared
 * client from here so connection pooling stays sane and a single client
 * instance can be reused across hot-reloads in dev.
 */
import { PrismaClient } from '@prisma/client';

// Re-export the entire Prisma namespace + types for downstream consumers.
export * from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __customMerchPrisma__: PrismaClient | undefined;
}

/**
 * Returns a process-wide PrismaClient instance.
 * In dev, hot-reloads reuse the cached instance to avoid exhausting connections.
 */
export function getPrismaClient(): PrismaClient {
  if (!globalThis.__customMerchPrisma__) {
    globalThis.__customMerchPrisma__ = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return globalThis.__customMerchPrisma__;
}

/** Convenience shared instance — equivalent to calling {@link getPrismaClient}. */
export const prisma: PrismaClient = getPrismaClient();
