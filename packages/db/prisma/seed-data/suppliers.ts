import type { PrintMethod } from '@prisma/client';

export interface SeedSupplierSpec {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  capabilities: PrintMethod[];
  countryCode: string;
  avgLeadDays: number;
  qualityScore: number;
  notes?: string;
  /**
   * Product-slug → mappings list. The seeder resolves slug → productId at run
   * time and creates a `SupplierProductMapping` per mapping (one per print
   * method).
   */
  productMappings: Array<{
    productSlug: string;
    printMethod: PrintMethod;
    /** Supplier unit cost in USD cents (currency = USD across the seed). */
    unitCostAmountMinor: number;
    minOrderQuantity?: number;
    dailyCapacity?: number;
    leadDays?: number;
  }>;
}

export const SEED_SUPPLIERS: SeedSupplierSpec[] = [
  {
    name: 'US POD Supplier',
    contactEmail: 'orders@us-pod.example',
    contactPhone: '+1-555-0100',
    capabilities: ['dtg', 'sublimation', 'heat_transfer'],
    countryCode: 'US',
    avgLeadDays: 4,
    qualityScore: 92,
    notes: 'Domestic US fulfillment, fast turnaround.',
    productMappings: [
      { productSlug: 'premium-cotton-tee', printMethod: 'dtg', unitCostAmountMinor: 850 },
      { productSlug: 'performance-tee', printMethod: 'sublimation', unitCostAmountMinor: 950 },
      { productSlug: 'v-neck-tee', printMethod: 'dtg', unitCostAmountMinor: 900 },
      { productSlug: 'classic-ceramic-mug', printMethod: 'sublimation', unitCostAmountMinor: 550 },
      { productSlug: 'color-changing-mug', printMethod: 'sublimation', unitCostAmountMinor: 700 },
      { productSlug: 'canvas-tote', printMethod: 'dtg', unitCostAmountMinor: 650 },
      { productSlug: 'eco-tote', printMethod: 'dtg', unitCostAmountMinor: 800 },
    ],
  },
  {
    name: 'EU POD Supplier',
    contactEmail: 'eu-orders@eu-pod.example',
    contactPhone: '+49-30-1234567',
    capabilities: ['dtg', 'screen_printing'],
    countryCode: 'DE',
    avgLeadDays: 5,
    qualityScore: 90,
    notes: 'EU fulfillment with VAT-compliant invoicing.',
    productMappings: [
      { productSlug: 'premium-cotton-tee', printMethod: 'dtg', unitCostAmountMinor: 900 },
      { productSlug: 'pullover-hoodie', printMethod: 'screen_printing', unitCostAmountMinor: 1850 },
      { productSlug: 'lightweight-hoodie', printMethod: 'dtg', unitCostAmountMinor: 1700 },
      { productSlug: 'canvas-tote', printMethod: 'screen_printing', unitCostAmountMinor: 600 },
      { productSlug: 'cotton-shopper', printMethod: 'screen_printing', unitCostAmountMinor: 380 },
    ],
  },
  {
    name: 'China Apparel Factory',
    contactEmail: 'sales@cn-apparel.example',
    contactPhone: '+86-21-66889900',
    capabilities: ['dtg', 'screen_printing', 'embroidery', 'heat_transfer'],
    countryCode: 'CN',
    avgLeadDays: 12,
    qualityScore: 86,
    notes: 'Bulk apparel manufacturing, MOQ 50.',
    productMappings: [
      { productSlug: 'premium-cotton-tee', printMethod: 'screen_printing', unitCostAmountMinor: 600, minOrderQuantity: 50, dailyCapacity: 2000 },
      { productSlug: 'pullover-hoodie', printMethod: 'screen_printing', unitCostAmountMinor: 1500, minOrderQuantity: 50 },
      { productSlug: 'zip-up-hoodie', printMethod: 'embroidery', unitCostAmountMinor: 1900, minOrderQuantity: 50 },
      { productSlug: 'lightweight-hoodie', printMethod: 'heat_transfer', unitCostAmountMinor: 1450, minOrderQuantity: 50 },
      { productSlug: 'v-neck-tee', printMethod: 'heat_transfer', unitCostAmountMinor: 700 },
    ],
  },
  {
    name: 'China Gift Factory',
    contactEmail: 'rfq@cn-gifts.example',
    contactPhone: '+86-755-22887766',
    capabilities: ['uv_printing', 'sublimation', 'heat_transfer'],
    countryCode: 'CN',
    avgLeadDays: 14,
    qualityScore: 84,
    notes: 'Mugs / bottles / drinkware specialist.',
    productMappings: [
      { productSlug: 'classic-ceramic-mug', printMethod: 'uv_printing', unitCostAmountMinor: 380 },
      { productSlug: 'travel-mug', printMethod: 'uv_printing', unitCostAmountMinor: 750 },
      { productSlug: 'color-changing-mug', printMethod: 'sublimation', unitCostAmountMinor: 600 },
      { productSlug: 'vinyl-die-cut-sticker', printMethod: 'uv_printing', unitCostAmountMinor: 60 },
      { productSlug: 'holographic-sticker', printMethod: 'uv_printing', unitCostAmountMinor: 90 },
      { productSlug: 'bumper-sticker', printMethod: 'uv_printing', unitCostAmountMinor: 120 },
    ],
  },
  {
    name: 'China Embroidery Factory',
    contactEmail: 'sales@cn-embroidery.example',
    contactPhone: '+86-571-99887700',
    capabilities: ['embroidery'],
    countryCode: 'CN',
    avgLeadDays: 15,
    qualityScore: 88,
    notes: 'Premium embroidery for hats and apparel.',
    productMappings: [
      { productSlug: 'snapback-cap', printMethod: 'embroidery', unitCostAmountMinor: 700 },
      { productSlug: 'trucker-cap', printMethod: 'embroidery', unitCostAmountMinor: 600 },
      { productSlug: 'beanie', printMethod: 'embroidery', unitCostAmountMinor: 550 },
      { productSlug: 'pullover-hoodie', printMethod: 'embroidery', unitCostAmountMinor: 1700, minOrderQuantity: 30 },
      { productSlug: 'zip-up-hoodie', printMethod: 'embroidery', unitCostAmountMinor: 1850, minOrderQuantity: 30 },
    ],
  },
];
