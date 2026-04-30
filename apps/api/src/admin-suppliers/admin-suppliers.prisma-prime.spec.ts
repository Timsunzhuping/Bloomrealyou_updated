import {
  __resetPrismaSinkForTests,
  __setPrismaClientForTests,
} from '../_lib/prisma-sink';

import { AdminSuppliersRepository } from './admin-suppliers.repository';

/**
 * Verifies the Prisma-first read path: when `DATABASE_URL` resolves to a
 * client, the repository wipes its demo seed on boot and replaces it with
 * whatever the relational store holds. The synthetic client below stands in
 * for a real Postgres instance — same shape, no I/O.
 */
describe('AdminSuppliersRepository · prisma-first prime', () => {
  afterEach(() => {
    __resetPrismaSinkForTests();
  });

  it('replaces the seed with rows pulled from Prisma on init', async () => {
    const now = new Date('2026-04-29T00:00:00.000Z');
    __setPrismaClientForTests({
      supplier: {
        findMany: async () => [
          {
            id: '11111111-1111-1111-1111-111111111111',
            name: 'Hangzhou Apparel',
            contactEmail: 'ops@hz-apparel.example',
            contactPhone: null,
            status: 'active',
            capabilities: ['dtg', 'screen_printing'],
            countryCode: 'CN',
            avgLeadDays: 6,
            qualityScore: 90,
            notes: null,
            metadata: {
              region: 'Zhejiang',
              contactName: 'Wu Lin',
              minOrderQuantity: 100,
              onTimeRate: 0.97,
              returnRate: 0.005,
              supportsWhiteLabel: true,
              supportsSample: false,
              supportedCategories: ['t-shirts'],
              extraPrintMethods: ['dtg', 'screen_printing'],
            },
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      supplierProductMapping: {
        findMany: async () => [
          {
            id: '22222222-2222-2222-2222-222222222222',
            supplierId: '11111111-1111-1111-1111-111111111111',
            productId: 'prod_classic-cotton-tee',
            variantId: null,
            printMethod: 'dtg',
            currency: 'USD',
            unitCostAmountMinor: 720,
            minOrderQuantity: 100,
            dailyCapacity: 500,
            leadDays: 5,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
    });

    const repo = new AdminSuppliersRepository();
    expect(repo.allSuppliers().some((s) => s.id === 'sup_dragon')).toBe(true); // seeded

    await repo.onModuleInit();

    const suppliers = repo.allSuppliers();
    expect(suppliers).toHaveLength(1);
    expect(suppliers[0]).toMatchObject({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Hangzhou Apparel',
      country: 'CN',
      region: 'Zhejiang',
      qualityScore: 90,
    });

    const mappings = repo.listMappings();
    expect(mappings.items).toHaveLength(1);
    expect(mappings.items[0]).toMatchObject({
      id: '22222222-2222-2222-2222-222222222222',
      supplierId: '11111111-1111-1111-1111-111111111111',
      printMethods: ['dtg'],
      status: 'active',
    });
  });

  it('keeps the seed when Prisma is unavailable', async () => {
    __resetPrismaSinkForTests(); // ensure cache is empty
    const prevDbUrl = process.env.DATABASE_URL;
    delete process.env.DATABASE_URL;

    const repo = new AdminSuppliersRepository();
    const seeded = repo.allSuppliers().length;
    expect(seeded).toBeGreaterThan(0);

    await repo.onModuleInit();
    expect(repo.allSuppliers()).toHaveLength(seeded);

    if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
  });

  it('treats an empty Prisma table as authoritative (clears seed)', async () => {
    __setPrismaClientForTests({
      supplier: { findMany: async () => [] },
      supplierProductMapping: { findMany: async () => [] },
    });

    const repo = new AdminSuppliersRepository();
    expect(repo.allSuppliers().length).toBeGreaterThan(0);

    await repo.onModuleInit();
    expect(repo.allSuppliers()).toHaveLength(0);
    expect(repo.listMappings().items).toHaveLength(0);
  });
});
