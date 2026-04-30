import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  PrintMethod,
  ProductCategory,
  SupplierStatus,
} from '@custom-merch/shared';

import { AdminSuppliersRepository } from './admin-suppliers.repository';
import { SupplierRoutingService } from './supplier-routing.service';

const NOW = '2026-04-26T00:00:00.000Z';

function makeSupplier(partial: Partial<AdminSupplierDto>): AdminSupplierDto {
  return {
    id: `sup_${Math.random().toString(36).slice(2, 8)}`,
    name: 'Test Supplier',
    country: 'US',
    region: null,
    contactName: 'Tester',
    contactEmail: 'tester@example.com',
    contactPhone: null,
    supportedCategories: ['t-shirts'],
    supportedPrintMethods: ['dtg'],
    minOrderQuantity: 50,
    averageProductionDays: 5,
    qualityScore: 85,
    onTimeRate: 0.95,
    returnRate: 0.01,
    supportsWhiteLabel: true,
    supportsSample: true,
    status: 'active' satisfies SupplierStatus,
    notes: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

function makeMapping(
  supplierId: string,
  partial: Partial<AdminSupplierProductMappingDto> = {},
): AdminSupplierProductMappingDto {
  return {
    id: `map_${Math.random().toString(36).slice(2, 8)}`,
    supplierId,
    productId: 'prod_test',
    variantId: null,
    supplierSku: 'SKU-1',
    costPrice: { amountMinor: 800, currency: 'USD' },
    productionDays: 5,
    minOrderQuantity: 50,
    maxDailyCapacity: 200,
    printMethods: ['dtg'],
    status: 'active',
    createdAt: NOW,
    updatedAt: NOW,
    ...partial,
  };
}

/**
 * Build a fresh repo with a controlled fleet — bypasses the constructor's
 * default seed by clearing the maps and writing exactly what the test wants.
 */
function buildRepo(
  suppliers: AdminSupplierDto[],
  mappings: AdminSupplierProductMappingDto[] = [],
): AdminSuppliersRepository {
  const repo = new AdminSuppliersRepository();
  // Wipe the constructor seeds so each test runs against a known fixture.
  const internal = repo as unknown as {
    suppliers: Map<string, AdminSupplierDto>;
    mappings: Map<string, AdminSupplierProductMappingDto>;
  };
  internal.suppliers.clear();
  internal.mappings.clear();
  for (const s of suppliers) internal.suppliers.set(s.id, s);
  for (const m of mappings) internal.mappings.set(m.id, m);
  return repo;
}

const baseInput = {
  productId: 'prod_test',
  category: 't-shirts' as ProductCategory,
  printMethod: 'dtg' as PrintMethod,
  quantity: 100,
  destinationCountry: 'US',
};

describe('SupplierRoutingService', () => {
  describe('hard blocks', () => {
    it('rejects suppliers whose status is not active', () => {
      const blocked = makeSupplier({ id: 'sup_blocked', status: 'onboarding' });
      const ok = makeSupplier({ id: 'sup_ok' });
      const repo = buildRepo([blocked, ok]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_ok']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects suppliers that do not cover the requested category', () => {
      const wrongCat = makeSupplier({
        id: 'sup_wrongcat',
        supportedCategories: ['mugs', 'hats'],
      });
      const ok = makeSupplier({ id: 'sup_ok' });
      const repo = buildRepo([wrongCat, ok]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0]!.supplierId).toBe('sup_ok');
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects suppliers that do not cover the requested print method', () => {
      const wrongPrint = makeSupplier({
        id: 'sup_wrongprint',
        supportedPrintMethods: ['screen_printing', 'embroidery'],
      });
      const ok = makeSupplier({ id: 'sup_ok' });
      const repo = buildRepo([wrongPrint, ok]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_ok']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects suppliers whose mapping print methods exclude the request', () => {
      const supplier = makeSupplier({ id: 'sup_a' });
      const ok = makeSupplier({ id: 'sup_ok' });
      const mappingA = makeMapping('sup_a', {
        printMethods: ['screen_printing'],
      });
      const mappingOk = makeMapping('sup_ok');
      const repo = buildRepo([supplier, ok], [mappingA, mappingOk]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_ok']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects suppliers whose effective MOQ is above the requested quantity', () => {
      const tooLargeMoq = makeSupplier({ id: 'sup_moq', minOrderQuantity: 500 });
      const ok = makeSupplier({ id: 'sup_ok', minOrderQuantity: 50 });
      const repo = buildRepo([tooLargeMoq, ok]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend({ ...baseInput, quantity: 100 });

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_ok']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('respects the mapping MOQ override when stricter than the supplier MOQ', () => {
      const supplier = makeSupplier({ id: 'sup_a', minOrderQuantity: 1 });
      const mapping = makeMapping('sup_a', { minOrderQuantity: 500 });
      const repo = buildRepo([supplier], [mapping]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend({ ...baseInput, quantity: 100 });

      expect(result.recommendations).toHaveLength(0);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects non-white-label suppliers when requireWhiteLabel is set', () => {
      const noLabel = makeSupplier({ id: 'sup_nl', supportsWhiteLabel: false });
      const labeled = makeSupplier({ id: 'sup_l', supportsWhiteLabel: true });
      const repo = buildRepo([noLabel, labeled]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend({ ...baseInput, requireWhiteLabel: true });

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_l']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });

    it('rejects suppliers whose mapping cost exceeds the budget cap', () => {
      const supplier = makeSupplier({ id: 'sup_a' });
      const ok = makeSupplier({ id: 'sup_ok' });
      const overBudget = makeMapping('sup_a', {
        costPrice: { amountMinor: 1500, currency: 'USD' },
      });
      const within = makeMapping('sup_ok', {
        costPrice: { amountMinor: 700, currency: 'USD' },
      });
      const repo = buildRepo([supplier, ok], [overBudget, within]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend({ ...baseInput, budgetUnitPriceMinor: 1000 });

      expect(result.recommendations.map((r) => r.supplierId)).toEqual(['sup_ok']);
      expect(result.unmatchedSupplierCount).toBe(1);
    });
  });

  describe('scoring', () => {
    it('prefers domestic suppliers over distant ones when other factors match', () => {
      const us = makeSupplier({ id: 'sup_us', country: 'US' });
      const cn = makeSupplier({ id: 'sup_cn', country: 'CN' });
      const repo = buildRepo([us, cn], [makeMapping('sup_us'), makeMapping('sup_cn')]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations[0]!.supplierId).toBe('sup_us');
      expect(result.recommendations[0]!.reasonCodes).toContain('domesticShipping');
    });

    it('ranks the cheaper mapping higher when other dimensions tie', () => {
      const cheap = makeSupplier({ id: 'sup_cheap' });
      const pricey = makeSupplier({ id: 'sup_pricey' });
      const repo = buildRepo(
        [cheap, pricey],
        [
          makeMapping('sup_cheap', { costPrice: { amountMinor: 500, currency: 'USD' } }),
          makeMapping('sup_pricey', { costPrice: { amountMinor: 1200, currency: 'USD' } }),
        ],
      );
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations[0]!.supplierId).toBe('sup_cheap');
      expect(result.recommendations[0]!.reasonCodes).toContain('bestCost');
    });

    it('penalises suppliers whose return rate exceeds the threshold', () => {
      const reliable = makeSupplier({ id: 'sup_ok', returnRate: 0.005 });
      const flaky = makeSupplier({ id: 'sup_flaky', returnRate: 0.08 });
      const repo = buildRepo(
        [reliable, flaky],
        [makeMapping('sup_ok'), makeMapping('sup_flaky')],
      );
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      const ok = result.recommendations.find((r) => r.supplierId === 'sup_ok');
      const flak = result.recommendations.find((r) => r.supplierId === 'sup_flaky');

      expect(ok).toBeDefined();
      expect(flak).toBeDefined();
      expect(ok!.score).toBeGreaterThan(flak!.score);
      expect(flak!.reasonCodes).toContain('highReturnRate');
    });

    it('caps results to the top five even when more suppliers match', () => {
      const fleet = Array.from({ length: 8 }, (_, i) =>
        makeSupplier({ id: `sup_${i}`, qualityScore: 80 + i }),
      );
      const repo = buildRepo(fleet);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('returns no recommendations when the fleet is empty', () => {
      const repo = buildRepo([]);
      const svc = new SupplierRoutingService(repo);

      const result = svc.recommend(baseInput);

      expect(result.recommendations).toHaveLength(0);
      expect(result.unmatchedSupplierCount).toBe(0);
    });
  });
});
