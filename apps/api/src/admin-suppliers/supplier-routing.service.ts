import { Injectable } from '@nestjs/common';

import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  Currency,
  SupplierRecommendInput,
  SupplierRecommendResponse,
  SupplierRecommendation,
} from '@custom-merch/shared';

import { AdminSuppliersRepository } from './admin-suppliers.repository';

interface ScoringContext {
  supplier: AdminSupplierDto;
  mapping?: AdminSupplierProductMappingDto;
  input: SupplierRecommendInput;
}

interface ScoreResult {
  score: number;
  reasons: string[];
  reasonCodes: string[];
  blocked: boolean;
}

/**
 * Rule-based supplier scoring. Inputs feed into a weighted sum capped at 100.
 * Blocking checks (status / MOQ / categories / print method / white-label) skip
 * disqualified suppliers entirely. We document the weights inline so changes
 * stay auditable.
 *
 *   capability fit       (0–25): supportedCategories + supportedPrintMethods
 *   cost fit             (0–25): cheaper than median wins; budget cap is hard
 *   speed fit            (0–15): productionDays vs. fleet median
 *   quality              (0–15): qualityScore (0–100) → weight
 *   reliability          (0–15): on-time rate × 100 → weight
 *   geographic proximity (0–10): same destination country = full marks
 *   sample readiness     (0–5):  bonus when supportsSample is true
 *
 * Weights sum to 110; we cap and clamp into 0–100 so the score reads natural.
 */
@Injectable()
export class SupplierRoutingService {
  constructor(private readonly repo: AdminSuppliersRepository) {}

  recommend(input: SupplierRecommendInput): SupplierRecommendResponse {
    const suppliers = this.repo.allSuppliers();
    const mappings = this.repo.mappingsForProduct(input.productId, input.variantId);
    const mappingsBySupplier = new Map<string, AdminSupplierProductMappingDto>();
    for (const m of mappings) {
      const existing = mappingsBySupplier.get(m.supplierId);
      if (!existing || m.costPrice.amountMinor < existing.costPrice.amountMinor) {
        mappingsBySupplier.set(m.supplierId, m);
      }
    }

    const medianCost = median(
      mappings
        .filter((m) => m.printMethods.includes(input.printMethod))
        .map((m) => m.costPrice.amountMinor),
    ) ?? 0;
    const medianDays = median(suppliers.map((s) => s.averageProductionDays)) ?? 5;

    const recs: SupplierRecommendation[] = [];
    let unmatched = 0;

    for (const supplier of suppliers) {
      const mapping = mappingsBySupplier.get(supplier.id);
      const ctx: ScoringContext = { supplier, mapping, input };
      const score = scoreSupplier(ctx, { medianCost, medianDays });
      if (score.blocked) {
        unmatched += 1;
        continue;
      }

      const unitCostMinor = mapping?.costPrice.amountMinor ?? 0;
      const productionDays = mapping?.productionDays ?? supplier.averageProductionDays;
      const currency: Currency = (mapping?.costPrice.currency ?? input.currency ?? 'USD') as Currency;

      recs.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        score: clamp(Math.round(score.score), 0, 100),
        reasons: score.reasons,
        reasonCodes: score.reasonCodes,
        estimatedUnitCostMinor: unitCostMinor,
        estimatedTotalCostMinor: unitCostMinor * input.quantity,
        estimatedProductionDays: productionDays,
        currency,
      });
    }

    recs.sort((a, b) => b.score - a.score || a.estimatedUnitCostMinor - b.estimatedUnitCostMinor);
    return { recommendations: recs.slice(0, 5), unmatchedSupplierCount: unmatched };
  }
}

function scoreSupplier(
  ctx: ScoringContext,
  ref: { medianCost: number; medianDays: number },
): ScoreResult {
  const { supplier, mapping, input } = ctx;
  const reasons: string[] = [];
  const reasonCodes: string[] = [];
  const block = (): ScoreResult => ({ score: 0, reasons, reasonCodes, blocked: true });

  if (supplier.status !== 'active') return block();
  if (!supplier.supportedCategories.includes(input.category)) return block();
  if (!supplier.supportedPrintMethods.includes(input.printMethod)) return block();

  // Honor mapping print-method when present (mappings are more specific).
  if (mapping && !mapping.printMethods.includes(input.printMethod)) return block();

  const moq = Math.max(supplier.minOrderQuantity, mapping?.minOrderQuantity ?? 0);
  if (input.quantity < moq) return block();

  if (input.requireWhiteLabel && !supplier.supportsWhiteLabel) return block();

  if (input.budgetUnitPriceMinor && mapping && mapping.costPrice.amountMinor > input.budgetUnitPriceMinor) {
    return block();
  }

  // ── capability fit (0–25)
  let capability = 15; // base for matching category + print method
  if (mapping) {
    capability += 10;
    reasons.push('SKU mapping in place');
    reasonCodes.push('mappingMatch');
  } else {
    reasons.push('Capability match');
    reasonCodes.push('capabilityMatch');
  }

  // ── cost fit (0–25)
  let cost = 10;
  if (mapping) {
    if (ref.medianCost > 0) {
      const ratio = mapping.costPrice.amountMinor / ref.medianCost;
      if (ratio <= 0.85) {
        cost = 25;
        reasons.push('Best cost');
        reasonCodes.push('bestCost');
      } else if (ratio <= 1.0) {
        cost = 18;
        reasons.push('Cost below median');
        reasonCodes.push('belowMedianCost');
      } else if (ratio <= 1.15) {
        cost = 10;
      } else {
        cost = 4;
      }
    } else {
      cost = 15;
    }
  } else {
    reasons.push('No fixed price — quote required');
    reasonCodes.push('quoteRequired');
  }

  // ── speed fit (0–15)
  const days = mapping?.productionDays ?? supplier.averageProductionDays;
  let speed = 5;
  if (days <= ref.medianDays * 0.8) {
    speed = 15;
    reasons.push(`Fast production (${days}d)`);
    reasonCodes.push('fastProduction');
  } else if (days <= ref.medianDays) {
    speed = 10;
  }

  // ── quality (0–15)
  const quality = clamp((supplier.qualityScore / 100) * 15, 0, 15);
  if (supplier.qualityScore >= 90) {
    reasons.push('High quality score');
    reasonCodes.push('highQuality');
  }

  // ── reliability (0–15)
  const reliability = clamp(supplier.onTimeRate * 15, 0, 15);
  if (supplier.onTimeRate >= 0.95) {
    reasons.push(`On-time ${Math.round(supplier.onTimeRate * 100)}%`);
    reasonCodes.push('onTimeRate');
  }

  // ── geographic proximity (0–10)
  let geo = 0;
  if (supplier.country === input.destinationCountry) {
    geo = 10;
    reasons.push('Domestic shipping');
    reasonCodes.push('domesticShipping');
  } else if (sameRegion(supplier.country, input.destinationCountry)) {
    geo = 6;
    reasons.push('Same region');
    reasonCodes.push('sameRegion');
  }

  // ── sample readiness (0–5)
  const sample = supplier.supportsSample ? 5 : 0;
  if (supplier.supportsSample) {
    reasons.push('Samples available');
    reasonCodes.push('supportsSample');
  }

  // ── return rate penalty
  const returnPenalty = supplier.returnRate > 0.03 ? -8 : 0;
  if (returnPenalty < 0) {
    reasons.push('High return rate');
    reasonCodes.push('highReturnRate');
  }

  const total = capability + cost + speed + quality + reliability + geo + sample + returnPenalty;
  return {
    score: total,
    reasons: dedupe(reasons),
    reasonCodes: dedupe(reasonCodes),
    blocked: false,
  };
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function dedupe<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

const REGION_GROUPS: Record<string, string[]> = {
  NA: ['US', 'CA', 'MX'],
  EU: ['ES', 'FR', 'DE', 'IT', 'NL', 'PL', 'GB'],
  APAC: ['CN', 'JP', 'KR', 'SG', 'AU', 'NZ', 'IN'],
  MEA: ['AE', 'SA', 'EG', 'IL'],
};

function sameRegion(a: string, b: string): boolean {
  for (const list of Object.values(REGION_GROUPS)) {
    if (list.includes(a) && list.includes(b)) return true;
  }
  return false;
}
