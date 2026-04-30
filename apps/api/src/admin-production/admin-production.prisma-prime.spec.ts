import {
  __resetPrismaSinkForTests,
  __setPrismaClientForTests,
} from '../_lib/prisma-sink';

import { AdminProductionRepository } from './admin-production.repository';

/**
 * Verifies the production-job repository hydrates from Prisma on boot. The
 * legacy schema enum is collapsed to fit the WP-02 vocabulary; we confirm
 * round-tripping `metadata.runtimeStatus` preserves the WP-15 status exactly.
 */
describe('AdminProductionRepository · prisma-first prime', () => {
  afterEach(() => {
    __resetPrismaSinkForTests();
  });

  it('hydrates the cache from Prisma on init', async () => {
    const now = new Date('2026-04-29T00:00:00.000Z');
    __setPrismaClientForTests({
      productionJob: {
        findMany: async () => [
          {
            id: '33333333-3333-3333-3333-333333333333',
            jobNumber: 'JOB-2026-0001',
            orderId: 'ord_abc',
            supplierId: '11111111-1111-1111-1111-111111111111',
            printMethod: 'dtg',
            status: 'in_progress',
            quantity: 200,
            currency: 'USD',
            supplierCostAmountMinor: 18000,
            expectedReadyAt: now,
            startedAt: now,
            completedAt: null,
            qcNotes: null,
            failureReason: null,
            metadata: {
              runtimeStatus: 'qc_pending',
              orderItemIds: ['oi_1'],
              qcAttachments: [],
              internalNotes: [],
              supplierName: 'Hangzhou Apparel',
            },
            createdAt: now,
            updatedAt: now,
            order: { orderNumber: 'ORD-1001' },
          },
        ],
      },
    });

    const repo = new AdminProductionRepository();
    expect(repo.list().items).toHaveLength(0); // empty before init

    await repo.onModuleInit();

    const jobs = repo.list();
    expect(jobs.items).toHaveLength(1);
    expect(jobs.items[0]).toMatchObject({
      id: '33333333-3333-3333-3333-333333333333',
      jobNumber: 'JOB-2026-0001',
      orderNumber: 'ORD-1001',
      // WP-15 runtime status preserved across the legacy-enum round trip.
      status: 'qc_pending',
      supplierName: 'Hangzhou Apparel',
      orderItemIds: ['oi_1'],
    });
    expect(repo.listForOrder('ord_abc')).toHaveLength(1);
  });

  it('falls back to the empty cache when Prisma is unavailable', async () => {
    __resetPrismaSinkForTests();
    const prevDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const repo = new AdminProductionRepository();
    await repo.onModuleInit();
    expect(repo.list().items).toHaveLength(0);

    if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
  });
});
