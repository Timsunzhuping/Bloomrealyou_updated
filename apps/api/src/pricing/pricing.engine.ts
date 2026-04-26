/**
 * Pure pricing engine. Given a product bundle (variant + price tiers) and a
 * cart-item-shaped request, returns a structured PricingResult with line-item
 * breakdown. No I/O — easy to unit test and reuse on the client.
 */
import type {
  Currency,
  Money,
  PricingInput,
  PricingLineItem,
  PricingResult,
  PrintMethod,
  Product,
  ProductPriceTier,
  ProductVariant,
} from '@custom-merch/shared';

interface EngineInput {
  product: Product;
  variant?: ProductVariant;
  priceTiers: ProductPriceTier[];
  request: PricingInput;
}

/** Per-area fee in USD minor units, applied per unit. */
const PRINT_AREA_FEE_USD_MINOR: Record<PrintMethod, number> = {
  dtg: 100,
  screen_printing: 50,
  embroidery: 150,
  heat_transfer: 75,
  uv_printing: 60,
  sublimation: 40,
};

/** Rush surcharge expressed as a percentage of the printed subtotal. */
const RUSH_SURCHARGE_PCT = 15;

/** Fallback shipping rate band used when shipping country is unknown. */
const SHIPPING_DEFAULT = { flatMinor: 1000, perUnitMinor: 10 };
const SHIPPING_BANDS: Record<string, { flatMinor: number; perUnitMinor: number }> = {
  US: { flatMinor: 500, perUnitMinor: 5 },
  CA: { flatMinor: 700, perUnitMinor: 7 },
  GB: { flatMinor: 800, perUnitMinor: 8 },
  DE: { flatMinor: 800, perUnitMinor: 8 },
  FR: { flatMinor: 800, perUnitMinor: 8 },
  AE: { flatMinor: 1200, perUnitMinor: 12 },
  CN: { flatMinor: 1200, perUnitMinor: 12 },
};

function money(amountMinor: number, currency: Currency): Money {
  return { amountMinor: Math.max(0, Math.round(amountMinor)), currency };
}

function applyTier(
  baseUnitMinor: number,
  quantity: number,
  tiers: ProductPriceTier[],
): number {
  if (tiers.length === 0) return baseUnitMinor;
  const matched = tiers
    .filter((t) => quantity >= t.minQuantity && (t.maxQuantity === null || quantity <= t.maxQuantity))
    .sort((a, b) => a.unitPrice.amountMinor - b.unitPrice.amountMinor)[0];
  return matched ? matched.unitPrice.amountMinor : baseUnitMinor;
}

function shippingFee(
  country: string | undefined,
  quantity: number,
): number {
  const band =
    (country ? SHIPPING_BANDS[country.toUpperCase()] : undefined) ?? SHIPPING_DEFAULT;
  return band.flatMinor + band.perUnitMinor * quantity;
}

export function calculatePricing(input: EngineInput): PricingResult {
  const { product, variant, priceTiers, request } = input;
  const currency: Currency = (request.currency ?? variant?.price.currency ?? product.basePrice.currency) as Currency;
  const quantity = Math.max(1, Math.floor(request.quantity));

  const baseUnitMinor = variant?.price.amountMinor ?? product.basePrice.amountMinor;
  const tieredUnitMinor = applyTier(baseUnitMinor, quantity, priceTiers);
  const subtotalMinor = tieredUnitMinor * quantity;

  const printAreaCount = Math.max(0, request.printAreas?.length ?? 0);
  const perAreaFee = request.printMethod ? PRINT_AREA_FEE_USD_MINOR[request.printMethod] : 0;
  const printingFeeMinor = perAreaFee * printAreaCount * quantity;

  const shippingFeeMinor = shippingFee(request.shippingCountry, quantity);

  const printedSubtotal = subtotalMinor + printingFeeMinor;
  const rushFeeMinor = request.rush ? Math.round((printedSubtotal * RUSH_SURCHARGE_PCT) / 100) : 0;

  const discountMinor = 0;

  const totalMinor = subtotalMinor + printingFeeMinor + shippingFeeMinor + rushFeeMinor - discountMinor;

  const productionDays = Math.max(1, product.productionLeadDays - (request.rush ? 2 : 0));
  const deliveryDaysExtra =
    request.shippingCountry && request.shippingCountry.toUpperCase() === 'US' ? 5 : 10;
  const estimatedDeliveryDays = productionDays + deliveryDaysExtra - (request.rush ? 2 : 0);

  const breakdown: PricingLineItem[] = [
    {
      code: 'subtotal',
      label: `Product × ${quantity}`,
      amount: money(subtotalMinor, currency),
    },
  ];
  if (printingFeeMinor > 0) {
    breakdown.push({
      code: 'printing_fee',
      label: `Printing (${printAreaCount} area${printAreaCount === 1 ? '' : 's'})`,
      amount: money(printingFeeMinor, currency),
    });
  }
  if (shippingFeeMinor > 0) {
    breakdown.push({
      code: 'shipping_fee',
      label: 'Shipping',
      amount: money(shippingFeeMinor, currency),
    });
  }
  if (rushFeeMinor > 0) {
    breakdown.push({
      code: 'rush_fee',
      label: `Rush (+${RUSH_SURCHARGE_PCT}%)`,
      amount: money(rushFeeMinor, currency),
    });
  }
  if (discountMinor > 0) {
    breakdown.push({
      code: 'discount',
      label: 'Discount',
      amount: money(-discountMinor, currency),
    });
  }

  return {
    currency,
    unitPrice: money(tieredUnitMinor, currency),
    subtotal: money(subtotalMinor, currency),
    printingFee: money(printingFeeMinor, currency),
    shippingFee: money(shippingFeeMinor, currency),
    rushFee: money(rushFeeMinor, currency),
    discount: money(discountMinor, currency),
    total: money(totalMinor, currency),
    estimatedProductionDays: productionDays,
    estimatedDeliveryDays,
    breakdown,
  };
}
