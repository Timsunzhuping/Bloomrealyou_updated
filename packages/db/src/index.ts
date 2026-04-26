/**
 * Single shared Prisma client. Apps should import from this package rather than
 * instantiating their own Prisma client to ensure connection pooling stays sane.
 *
 * NOTE: We intentionally type the export as `unknown`-shaped here in WP-00
 * because the Prisma client is generated at build time. Apps that consume this
 * after running `pnpm --filter @custom-merch/db prisma:generate` get full types
 * via `@prisma/client`.
 */

let cachedClient: unknown = null;

export async function getPrismaClient(): Promise<unknown> {
  if (cachedClient) return cachedClient;
  const mod = (await import('@prisma/client')) as { PrismaClient: new () => unknown };
  cachedClient = new mod.PrismaClient();
  return cachedClient;
}
