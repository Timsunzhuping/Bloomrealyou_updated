import type {
  Product,
  ProductId,
  ProductPriceTier,
  ProductPriceTierId,
  ProductVariant,
  ProductVariantId,
} from '@custom-merch/shared';

import { calculatePricing } from './pricing.engine';

const NOW = '2026-04-26T00:00:00.000Z';

const PRODUCT: Product = {
  id: 'prod_test' as ProductId,
  slug: 'tee',
  category: 't-shirts',
  status: 'active',
  name: { en: 'Tee' },
  description: { en: '...' },
  supportedPrintMethods: ['dtg'],
  imageUrls: [],
  basePrice: { amountMinor: 1999, currency: 'USD' },
  tags: [],
  productionLeadDays: 5,
  createdAt: NOW,
  updatedAt: NOW,
};

const VARIANT: ProductVariant = {
  id: 'var_test' as ProductVariantId,
  productId: PRODUCT.id,
  sku: 'TEE-BLK-M',
  attributes: {},
  price: { amountMinor: 1999, currency: 'USD' },
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const TIERS: ProductPriceTier[] = [
  { id: 't1' as ProductPriceTierId, productId: PRODUCT.id, minQuantity: 1, maxQuantity: 24, unitPrice: { amountMinor: 1999, currency: 'USD' } },
  { id: 't2' as ProductPriceTierId, productId: PRODUCT.id, minQuantity: 25, maxQuantity: 99, unitPrice: { amountMinor: 1700, currency: 'USD' } },
  { id: 't3' as ProductPriceTierId, productId: PRODUCT.id, minQuantity: 100, maxQuantity: null, unitPrice: { amountMinor: 1400, currency: 'USD' } },
];

describe('calculatePricing', () => {
  it('uses base tier for small quantities', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: {
        productId: PRODUCT.id,
        quantity: 1,
        printMethod: 'dtg',
        printAreas: ['front'],
        shippingCountry: 'US',
      },
    });
    expect(r.unitPrice.amountMinor).toBe(1999);
    expect(r.subtotal.amountMinor).toBe(1999);
    expect(r.printingFee.amountMinor).toBe(100); // 1 area × $1 × 1 unit
    expect(r.shippingFee.amountMinor).toBe(505); // US: 500 + 5×1
    expect(r.total.amountMinor).toBe(1999 + 100 + 505);
  });

  it('applies the volume tier at 100 units', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: {
        productId: PRODUCT.id,
        quantity: 100,
        printMethod: 'dtg',
        printAreas: ['front'],
        shippingCountry: 'US',
      },
    });
    expect(r.unitPrice.amountMinor).toBe(1400); // tier 3
    expect(r.subtotal.amountMinor).toBe(140_000);
  });

  it('multiplies the print fee by area count and quantity', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: {
        productId: PRODUCT.id,
        quantity: 10,
        printMethod: 'embroidery',
        printAreas: ['front', 'back'],
        shippingCountry: 'US',
      },
    });
    // embroidery 150 × 2 areas × 10 units
    expect(r.printingFee.amountMinor).toBe(3000);
  });

  it('applies a rush surcharge to subtotal + printing', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: {
        productId: PRODUCT.id,
        quantity: 10,
        printMethod: 'dtg',
        printAreas: ['front'],
        shippingCountry: 'US',
        rush: true,
      },
    });
    const printedSubtotal = 1999 * 10 + 100 * 1 * 10;
    expect(r.rushFee.amountMinor).toBe(Math.round((printedSubtotal * 15) / 100));
    expect(r.estimatedProductionDays).toBe(Math.max(1, 5 - 2));
  });

  it('produces a defensive shipping rate when country is unknown', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: {
        productId: PRODUCT.id,
        quantity: 5,
        shippingCountry: 'ZZ',
      },
    });
    // default 1000 + 10 × 5
    expect(r.shippingFee.amountMinor).toBe(1050);
  });

  it('returns a sensible result when no print method is supplied', () => {
    const r = calculatePricing({
      product: PRODUCT,
      variant: VARIANT,
      priceTiers: TIERS,
      request: { productId: PRODUCT.id, quantity: 1 },
    });
    expect(r.printingFee.amountMinor).toBe(0);
  });
});
