import { Injectable, NotFoundException } from '@nestjs/common';

import {
  findMockProductById,
  findMockProductBySlug,
  type PricingInput,
  type PricingResult,
} from '@custom-merch/shared';

import { calculatePricing } from './pricing.engine';

@Injectable()
export class PricingService {
  /** Compute pricing for a product / variant / qty combo. */
  calculate(input: PricingInput): PricingResult {
    const bundle =
      findMockProductById(input.productId) ?? findMockProductBySlug(input.productId);
    if (!bundle) {
      throw new NotFoundException(`Product not found: ${input.productId}`);
    }
    const variant = input.variantId
      ? bundle.variants.find((v) => v.id === input.variantId)
      : undefined;
    return calculatePricing({
      product: bundle.product,
      variant,
      priceTiers: bundle.priceTiers,
      request: input,
    });
  }
}
