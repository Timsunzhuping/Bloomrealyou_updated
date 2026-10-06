import { Injectable, NotFoundException } from '@nestjs/common';

import { type PricingInput, type PricingResult } from '@custom-merch/shared';

import { calculatePricing } from './pricing.engine';
import { CatalogService } from '../products/catalog.service';

@Injectable()
export class PricingService {
  constructor(private readonly catalog: CatalogService) {}
  /** Compute pricing for a product / variant / qty combo. */
  calculate(input: PricingInput): PricingResult {
    const bundle = this.catalog.find(input.productId);
    if (!bundle) {
      throw new NotFoundException(`Product not found: ${input.productId}`);
    }
    const variant = input.variantId
      ? bundle.variants.find((v) => v.id === input.variantId)
      : undefined;
    if (input.variantId && !variant)
      throw new NotFoundException(`Variant not found: ${input.variantId}`);
    return calculatePricing({
      product: bundle.product,
      variant,
      priceTiers: bundle.priceTiers.filter(
        (t) =>
          (!t.currency ||
            t.currency ===
              (input.currency ?? variant?.price.currency ?? bundle.product.basePrice.currency)) &&
          (!t.printMethod || t.printMethod === input.printMethod),
      ),
      request: input,
    });
  }
}
