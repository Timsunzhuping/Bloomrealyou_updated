import type { PrintMethod, ProductCategory } from '@prisma/client';

export interface SeedProductVariantSpec {
  /** Suffix appended to the product slug to build the SKU. */
  skuSuffix: string;
  attributes: Record<string, string>;
  /** Optional override (in cents) of the product base price. */
  priceAmountMinor?: number;
  weightGrams?: number;
}

export interface SeedPrintAreaSpec {
  key: string;
  label: { en: string; 'zh-CN'?: string; es?: string; ar?: string };
  widthPx: number;
  heightPx: number;
  mockupOffsetXPx?: number;
  mockupOffsetYPx?: number;
  allowedPrintMethods: PrintMethod[];
}

export interface SeedPriceTierSpec {
  minQuantity: number;
  maxQuantity: number | null;
  unitPriceAmountMinor: number;
}

export interface SeedProductSpec {
  slug: string;
  category: ProductCategory;
  name: { en: string; 'zh-CN': string; es: string; ar: string };
  description: { en: string; 'zh-CN': string; es: string; ar: string };
  supportedPrintMethods: PrintMethod[];
  gallery: string[];
  /** Base price in USD cents. */
  basePriceAmountMinor: number;
  productionLeadDays: number;
  tags: string[];
  variants: SeedProductVariantSpec[];
  printAreas: SeedPrintAreaSpec[];
  priceTiers: SeedPriceTierSpec[];
}

const galleryStub = (slug: string): string[] => [
  `https://placehold.co/800x800?text=${slug}-front`,
  `https://placehold.co/800x800?text=${slug}-back`,
];

/** Standard 3-tier volume pricing curve: 1-49 / 50-199 / 200+. */
const tiers = (base: number): SeedPriceTierSpec[] => [
  { minQuantity: 1, maxQuantity: 49, unitPriceAmountMinor: base },
  { minQuantity: 50, maxQuantity: 199, unitPriceAmountMinor: Math.round(base * 0.9) },
  { minQuantity: 200, maxQuantity: null, unitPriceAmountMinor: Math.round(base * 0.8) },
];

const APPAREL_PRINT_AREAS: SeedPrintAreaSpec[] = [
  {
    key: 'front',
    label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
    widthPx: 3000,
    heightPx: 3600,
    allowedPrintMethods: ['dtg', 'screen_printing', 'heat_transfer'],
  },
  {
    key: 'back',
    label: { en: 'Back', 'zh-CN': '背面', es: 'Atrás', ar: 'الخلف' },
    widthPx: 3000,
    heightPx: 3600,
    allowedPrintMethods: ['dtg', 'screen_printing', 'heat_transfer'],
  },
];

const HOODIE_PRINT_AREAS: SeedPrintAreaSpec[] = [
  ...APPAREL_PRINT_AREAS,
  {
    key: 'left_sleeve',
    label: { en: 'Left Sleeve', 'zh-CN': '左袖', es: 'Manga izquierda', ar: 'الكم الأيسر' },
    widthPx: 1200,
    heightPx: 2400,
    allowedPrintMethods: ['embroidery', 'heat_transfer'],
  },
];

const apparelColours = ['black', 'white', 'navy', 'heather-grey', 'forest-green'];
const tShirtSizes = ['S', 'M', 'L', 'XL', '2XL'];
const hoodieSizes = ['S', 'M', 'L', 'XL', '2XL'];
const hatColours = ['black', 'navy', 'white', 'red'];
const mugColours = ['white', 'black', 'red'];
const bagColours = ['natural', 'black', 'navy', 'sage'];
const stickerSizes = ['2in', '3in', '4in'];

function apparelVariants(
  basePrice: number,
  colours: string[],
  sizes: string[],
): SeedProductVariantSpec[] {
  const out: SeedProductVariantSpec[] = [];
  for (const colour of colours) {
    for (const size of sizes) {
      const upcharge = size === '2XL' ? 200 : size === 'XL' ? 100 : 0;
      out.push({
        skuSuffix: `${colour}-${size.toLowerCase()}`,
        attributes: { color: colour, size },
        priceAmountMinor: basePrice + upcharge,
        weightGrams: 220,
      });
    }
  }
  return out;
}

export const SEED_PRODUCTS: SeedProductSpec[] = [
  // -------------------------------------------------------------------------- T-shirts
  {
    slug: 'premium-cotton-tee',
    category: 't_shirts',
    name: {
      en: 'Premium Cotton Tee',
      'zh-CN': '精梳棉 T 恤',
      es: 'Camiseta de algodón premium',
      ar: 'تيشيرت قطن فاخر',
    },
    description: {
      en: 'Soft 100% combed-cotton tee with reinforced shoulders. Ideal for DTG printing.',
      'zh-CN': '100% 精梳棉，肩缝加固，适合 DTG 印花。',
      es: '100% algodón peinado, hombros reforzados. Ideal para impresión DTG.',
      ar: '100٪ قطن مُمشّط بأكتاف معززة. مثالي للطباعة المباشرة على القماش.',
    },
    supportedPrintMethods: ['dtg', 'screen_printing', 'heat_transfer'],
    gallery: galleryStub('premium-cotton-tee'),
    basePriceAmountMinor: 1999,
    productionLeadDays: 5,
    tags: ['unisex', 'best-seller'],
    variants: apparelVariants(1999, apparelColours.slice(0, 5), tShirtSizes),
    printAreas: APPAREL_PRINT_AREAS,
    priceTiers: tiers(1999),
  },
  {
    slug: 'performance-tee',
    category: 't_shirts',
    name: {
      en: 'Performance Tee',
      'zh-CN': '运动速干 T 恤',
      es: 'Camiseta deportiva',
      ar: 'تيشيرت رياضي',
    },
    description: {
      en: 'Moisture-wicking polyester tee for sublimation prints.',
      'zh-CN': '吸湿排汗聚酯纤维，适合升华印花。',
      es: 'Poliéster transpirable apto para sublimación.',
      ar: 'بوليستر يمتص الرطوبة ومناسب للطباعة بالتسامي.',
    },
    supportedPrintMethods: ['sublimation', 'heat_transfer'],
    gallery: galleryStub('performance-tee'),
    basePriceAmountMinor: 2299,
    productionLeadDays: 6,
    tags: ['sport', 'sublimation'],
    variants: apparelVariants(2299, ['black', 'white', 'navy', 'red'], tShirtSizes.slice(0, 4)),
    printAreas: APPAREL_PRINT_AREAS,
    priceTiers: tiers(2299),
  },
  {
    slug: 'v-neck-tee',
    category: 't_shirts',
    name: {
      en: 'V-Neck Tee',
      'zh-CN': 'V 领 T 恤',
      es: 'Camiseta cuello V',
      ar: 'تيشيرت برقبة V',
    },
    description: {
      en: 'Lightweight V-neck tee in fashion fits.',
      'zh-CN': '轻盈 V 领 T 恤，时尚剪裁。',
      es: 'Camiseta ligera con cuello en V.',
      ar: 'تيشيرت خفيف برقبة V.',
    },
    supportedPrintMethods: ['dtg', 'heat_transfer'],
    gallery: galleryStub('v-neck-tee'),
    basePriceAmountMinor: 2099,
    productionLeadDays: 5,
    tags: ['fashion'],
    variants: apparelVariants(2099, ['black', 'white', 'heather-grey'], ['S', 'M', 'L', 'XL']),
    printAreas: APPAREL_PRINT_AREAS,
    priceTiers: tiers(2099),
  },

  // -------------------------------------------------------------------------- Hoodies
  {
    slug: 'pullover-hoodie',
    category: 'hoodies',
    name: {
      en: 'Pullover Hoodie',
      'zh-CN': '套头连帽衫',
      es: 'Sudadera con capucha',
      ar: 'هودي بدون سحاب',
    },
    description: {
      en: 'Classic 80/20 cotton-poly pullover with kangaroo pocket.',
      'zh-CN': '经典棉聚混纺套头帽衫，袋鼠口袋。',
      es: 'Sudadera clásica 80/20 algodón-poliéster.',
      ar: 'هودي كلاسيكي بنسبة 80/20 قطن-بوليستر.',
    },
    supportedPrintMethods: ['dtg', 'screen_printing', 'embroidery'],
    gallery: galleryStub('pullover-hoodie'),
    basePriceAmountMinor: 4499,
    productionLeadDays: 7,
    tags: ['warm', 'unisex'],
    variants: apparelVariants(4499, apparelColours, hoodieSizes),
    printAreas: HOODIE_PRINT_AREAS,
    priceTiers: tiers(4499),
  },
  {
    slug: 'zip-up-hoodie',
    category: 'hoodies',
    name: {
      en: 'Zip-up Hoodie',
      'zh-CN': '拉链连帽衫',
      es: 'Sudadera con cremallera',
      ar: 'هودي بسحاب',
    },
    description: {
      en: 'Full-zip hooded jacket with side pockets.',
      'zh-CN': '全拉链连帽外套，配侧袋。',
      es: 'Chaqueta con capucha y cremallera completa.',
      ar: 'جاكيت بقلنسوة وسحاب كامل.',
    },
    supportedPrintMethods: ['screen_printing', 'embroidery'],
    gallery: galleryStub('zip-up-hoodie'),
    basePriceAmountMinor: 4999,
    productionLeadDays: 7,
    tags: ['outerwear'],
    variants: apparelVariants(4999, ['black', 'navy', 'forest-green'], hoodieSizes.slice(0, 4)),
    printAreas: HOODIE_PRINT_AREAS,
    priceTiers: tiers(4999),
  },
  {
    slug: 'lightweight-hoodie',
    category: 'hoodies',
    name: {
      en: 'Lightweight Hoodie',
      'zh-CN': '轻量连帽衫',
      es: 'Sudadera ligera',
      ar: 'هودي خفيف',
    },
    description: {
      en: 'Lightweight blend hoodie for transitional weather.',
      'zh-CN': '过渡季节轻量连帽衫。',
      es: 'Sudadera ligera para entretiempo.',
      ar: 'هودي خفيف لفصول الانتقال.',
    },
    supportedPrintMethods: ['dtg', 'heat_transfer'],
    gallery: galleryStub('lightweight-hoodie'),
    basePriceAmountMinor: 3999,
    productionLeadDays: 6,
    tags: ['lightweight'],
    variants: apparelVariants(3999, ['heather-grey', 'navy', 'white'], hoodieSizes.slice(0, 4)),
    printAreas: APPAREL_PRINT_AREAS,
    priceTiers: tiers(3999),
  },

  // -------------------------------------------------------------------------- Mugs
  {
    slug: 'classic-ceramic-mug',
    category: 'mugs',
    name: {
      en: 'Classic Ceramic Mug',
      'zh-CN': '经典陶瓷马克杯',
      es: 'Taza cerámica clásica',
      ar: 'كوب سيراميك كلاسيكي',
    },
    description: {
      en: '11 oz ceramic mug, dishwasher-safe sublimation print.',
      'zh-CN': '11 盎司陶瓷马克杯，可机洗升华印花。',
      es: 'Taza cerámica de 11 oz con sublimación apta para lavavajillas.',
      ar: 'كوب سيراميك 11 أونصة بطباعة تسامي قابلة للغسل في غسالة الصحون.',
    },
    supportedPrintMethods: ['sublimation', 'uv_printing'],
    gallery: galleryStub('classic-ceramic-mug'),
    basePriceAmountMinor: 1299,
    productionLeadDays: 4,
    tags: ['gift', 'best-seller'],
    variants: mugColours.map((color) => ({
      skuSuffix: color,
      attributes: { color, capacity: '11oz' },
      priceAmountMinor: 1299,
      weightGrams: 380,
    })),
    printAreas: [
      {
        key: 'wrap',
        label: { en: 'Wrap', 'zh-CN': '环绕', es: 'Envolvente', ar: 'الغلاف' },
        widthPx: 3000,
        heightPx: 1200,
        allowedPrintMethods: ['sublimation', 'uv_printing'],
      },
    ],
    priceTiers: tiers(1299),
  },
  {
    slug: 'travel-mug',
    category: 'mugs',
    name: {
      en: 'Travel Mug',
      'zh-CN': '旅行保温杯',
      es: 'Taza de viaje',
      ar: 'كوب السفر',
    },
    description: {
      en: '15 oz double-wall stainless steel travel mug.',
      'zh-CN': '15 盎司双层不锈钢旅行杯。',
      es: 'Taza de viaje de acero inoxidable de doble pared.',
      ar: 'كوب سفر من الفولاذ المقاوم للصدأ بجدار مزدوج.',
    },
    supportedPrintMethods: ['uv_printing'],
    gallery: galleryStub('travel-mug'),
    basePriceAmountMinor: 1899,
    productionLeadDays: 5,
    tags: ['travel'],
    variants: mugColours.map((color) => ({
      skuSuffix: color,
      attributes: { color, capacity: '15oz' },
      priceAmountMinor: 1899,
      weightGrams: 480,
    })),
    printAreas: [
      {
        key: 'wrap',
        label: { en: 'Wrap', 'zh-CN': '环绕', es: 'Envolvente', ar: 'الغلاف' },
        widthPx: 3500,
        heightPx: 1400,
        allowedPrintMethods: ['uv_printing'],
      },
    ],
    priceTiers: tiers(1899),
  },
  {
    slug: 'color-changing-mug',
    category: 'mugs',
    name: {
      en: 'Color-Changing Mug',
      'zh-CN': '变色魔术杯',
      es: 'Taza mágica',
      ar: 'كوب متغير الألوان',
    },
    description: {
      en: '11 oz heat-reactive magic mug — design appears with hot drinks.',
      'zh-CN': '11 盎司温感变色魔术杯，遇热显图。',
      es: 'Taza mágica reactiva al calor.',
      ar: 'كوب سحري حراري يكشف عن التصميم بالحرارة.',
    },
    supportedPrintMethods: ['sublimation'],
    gallery: galleryStub('color-changing-mug'),
    basePriceAmountMinor: 1599,
    productionLeadDays: 5,
    tags: ['novelty', 'gift'],
    variants: ['black-to-white', 'red-to-white', 'blue-to-white'].map((color) => ({
      skuSuffix: color,
      attributes: { color, capacity: '11oz' },
      priceAmountMinor: 1599,
      weightGrams: 400,
    })),
    printAreas: [
      {
        key: 'wrap',
        label: { en: 'Wrap', 'zh-CN': '环绕', es: 'Envolvente', ar: 'الغلاف' },
        widthPx: 3000,
        heightPx: 1200,
        allowedPrintMethods: ['sublimation'],
      },
    ],
    priceTiers: tiers(1599),
  },

  // -------------------------------------------------------------------------- Hats
  {
    slug: 'snapback-cap',
    category: 'hats',
    name: {
      en: 'Snapback Cap',
      'zh-CN': '后扣棒球帽',
      es: 'Gorra snapback',
      ar: 'قبعة سناب باك',
    },
    description: {
      en: 'Flat-brim snapback with adjustable plastic closure.',
      'zh-CN': '平檐后扣棒球帽，塑胶可调。',
      es: 'Gorra de visera plana con ajuste plástico.',
      ar: 'قبعة بحافة مسطحة وإغلاق بلاستيكي قابل للتعديل.',
    },
    supportedPrintMethods: ['embroidery', 'heat_transfer'],
    gallery: galleryStub('snapback-cap'),
    basePriceAmountMinor: 2199,
    productionLeadDays: 8,
    tags: ['streetwear'],
    variants: hatColours.map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'one-size' },
      priceAmountMinor: 2199,
      weightGrams: 110,
    })),
    printAreas: [
      {
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
        widthPx: 1800,
        heightPx: 1200,
        allowedPrintMethods: ['embroidery', 'heat_transfer'],
      },
    ],
    priceTiers: tiers(2199),
  },
  {
    slug: 'trucker-cap',
    category: 'hats',
    name: {
      en: 'Trucker Cap',
      'zh-CN': '货车帽',
      es: 'Gorra trucker',
      ar: 'قبعة تراكر',
    },
    description: {
      en: 'Foam front, mesh back trucker cap.',
      'zh-CN': '前泡棉后网眼货车帽。',
      es: 'Gorra trucker frontal de espuma con malla.',
      ar: 'قبعة تراكر برغوة أمامية وشبكة خلفية.',
    },
    supportedPrintMethods: ['embroidery'],
    gallery: galleryStub('trucker-cap'),
    basePriceAmountMinor: 1899,
    productionLeadDays: 8,
    tags: ['casual'],
    variants: hatColours.map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'one-size' },
      priceAmountMinor: 1899,
      weightGrams: 95,
    })),
    printAreas: [
      {
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
        widthPx: 1800,
        heightPx: 1200,
        allowedPrintMethods: ['embroidery'],
      },
    ],
    priceTiers: tiers(1899),
  },
  {
    slug: 'beanie',
    category: 'hats',
    name: {
      en: 'Beanie',
      'zh-CN': '针织帽',
      es: 'Gorro tejido',
      ar: 'قبعة بيني',
    },
    description: {
      en: 'Knit beanie, embroidery-friendly cuff.',
      'zh-CN': '针织无檐帽，刺绣友好。',
      es: 'Gorro tejido con vuelta para bordado.',
      ar: 'قبعة محبوكة مناسبة للتطريز.',
    },
    supportedPrintMethods: ['embroidery'],
    gallery: galleryStub('beanie'),
    basePriceAmountMinor: 1599,
    productionLeadDays: 8,
    tags: ['winter'],
    variants: ['black', 'navy', 'heather-grey'].map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'one-size' },
      priceAmountMinor: 1599,
      weightGrams: 80,
    })),
    printAreas: [
      {
        key: 'cuff',
        label: { en: 'Cuff', 'zh-CN': '帽口', es: 'Vuelta', ar: 'الحافة' },
        widthPx: 1500,
        heightPx: 800,
        allowedPrintMethods: ['embroidery'],
      },
    ],
    priceTiers: tiers(1599),
  },

  // -------------------------------------------------------------------------- Tote Bags
  {
    slug: 'canvas-tote',
    category: 'tote_bags',
    name: {
      en: 'Canvas Tote',
      'zh-CN': '帆布托特包',
      es: 'Bolsa de lona',
      ar: 'حقيبة قماش',
    },
    description: {
      en: '12 oz heavyweight canvas tote, double-stitched handles.',
      'zh-CN': '12 盎司加厚帆布托特包，双线缝合提手。',
      es: 'Bolsa de lona resistente con asas de doble costura.',
      ar: 'حقيبة قماش 12 أونصة بمقابض مزدوجة الخياطة.',
    },
    supportedPrintMethods: ['screen_printing', 'dtg', 'heat_transfer'],
    gallery: galleryStub('canvas-tote'),
    basePriceAmountMinor: 1499,
    productionLeadDays: 5,
    tags: ['eco', 'gift'],
    variants: bagColours.map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'standard' },
      priceAmountMinor: 1499,
      weightGrams: 250,
    })),
    printAreas: [
      {
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
        widthPx: 2400,
        heightPx: 2400,
        allowedPrintMethods: ['screen_printing', 'dtg', 'heat_transfer'],
      },
      {
        key: 'back',
        label: { en: 'Back', 'zh-CN': '背面', es: 'Atrás', ar: 'الخلف' },
        widthPx: 2400,
        heightPx: 2400,
        allowedPrintMethods: ['screen_printing', 'dtg', 'heat_transfer'],
      },
    ],
    priceTiers: tiers(1499),
  },
  {
    slug: 'cotton-shopper',
    category: 'tote_bags',
    name: {
      en: 'Cotton Shopper',
      'zh-CN': '棉质购物袋',
      es: 'Bolsa de algodón',
      ar: 'حقيبة تسوق قطنية',
    },
    description: {
      en: 'Lightweight cotton shopper for promo giveaways.',
      'zh-CN': '轻量棉质购物袋，适合促销赠品。',
      es: 'Bolsa de algodón ligera para promociones.',
      ar: 'حقيبة تسوق قطنية خفيفة للهدايا الترويجية.',
    },
    supportedPrintMethods: ['screen_printing', 'heat_transfer'],
    gallery: galleryStub('cotton-shopper'),
    basePriceAmountMinor: 999,
    productionLeadDays: 5,
    tags: ['promo', 'eco'],
    variants: bagColours.slice(0, 3).map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'standard' },
      priceAmountMinor: 999,
      weightGrams: 130,
    })),
    printAreas: [
      {
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
        widthPx: 2200,
        heightPx: 2200,
        allowedPrintMethods: ['screen_printing', 'heat_transfer'],
      },
    ],
    priceTiers: tiers(999),
  },
  {
    slug: 'eco-tote',
    category: 'tote_bags',
    name: {
      en: 'Eco Tote',
      'zh-CN': '环保托特包',
      es: 'Bolsa eco',
      ar: 'حقيبة بيئية',
    },
    description: {
      en: 'Recycled-fibre tote bag with reinforced base.',
      'zh-CN': '再生纤维托特包，加固底部。',
      es: 'Bolsa de fibra reciclada con base reforzada.',
      ar: 'حقيبة من ألياف معاد تدويرها بقاعدة معززة.',
    },
    supportedPrintMethods: ['screen_printing', 'dtg'],
    gallery: galleryStub('eco-tote'),
    basePriceAmountMinor: 1799,
    productionLeadDays: 6,
    tags: ['eco', 'recycled'],
    variants: ['natural', 'sage', 'navy', 'black'].map((color) => ({
      skuSuffix: color,
      attributes: { color, size: 'standard' },
      priceAmountMinor: 1799,
      weightGrams: 220,
    })),
    printAreas: [
      {
        key: 'front',
        label: { en: 'Front', 'zh-CN': '正面', es: 'Frente', ar: 'الأمام' },
        widthPx: 2400,
        heightPx: 2400,
        allowedPrintMethods: ['screen_printing', 'dtg'],
      },
      {
        key: 'back',
        label: { en: 'Back', 'zh-CN': '背面', es: 'Atrás', ar: 'الخلف' },
        widthPx: 2400,
        heightPx: 2400,
        allowedPrintMethods: ['screen_printing', 'dtg'],
      },
    ],
    priceTiers: tiers(1799),
  },

  // -------------------------------------------------------------------------- Stickers
  {
    slug: 'vinyl-die-cut-sticker',
    category: 'stickers',
    name: {
      en: 'Vinyl Die-Cut Sticker',
      'zh-CN': '乙烯模切贴纸',
      es: 'Pegatina troquelada de vinilo',
      ar: 'ملصق فينيل مقصوص',
    },
    description: {
      en: 'Weatherproof die-cut vinyl stickers with laminated finish.',
      'zh-CN': '防水模切乙烯贴纸，覆膜处理。',
      es: 'Pegatinas de vinilo troqueladas y laminadas, resistentes al clima.',
      ar: 'ملصقات فينيل مقصوصة مقاومة للعوامل الجوية ومُلمَّعة.',
    },
    supportedPrintMethods: ['uv_printing'],
    gallery: galleryStub('vinyl-die-cut-sticker'),
    basePriceAmountMinor: 299,
    productionLeadDays: 4,
    tags: ['weatherproof'],
    variants: stickerSizes.map((size) => ({
      skuSuffix: size,
      attributes: { color: 'full-color', size },
      priceAmountMinor: size === '4in' ? 499 : size === '3in' ? 399 : 299,
      weightGrams: 5,
    })),
    printAreas: [
      {
        key: 'face',
        label: { en: 'Face', 'zh-CN': '正面', es: 'Cara', ar: 'الواجهة' },
        widthPx: 1200,
        heightPx: 1200,
        allowedPrintMethods: ['uv_printing'],
      },
    ],
    priceTiers: tiers(299),
  },
  {
    slug: 'holographic-sticker',
    category: 'stickers',
    name: {
      en: 'Holographic Sticker',
      'zh-CN': '镭射贴纸',
      es: 'Pegatina holográfica',
      ar: 'ملصق هولوغرام',
    },
    description: {
      en: 'Eye-catching holographic foil stickers.',
      'zh-CN': '抢眼的镭射箔片贴纸。',
      es: 'Pegatinas holográficas llamativas.',
      ar: 'ملصقات هولوغرام لافتة للنظر.',
    },
    supportedPrintMethods: ['uv_printing'],
    gallery: galleryStub('holographic-sticker'),
    basePriceAmountMinor: 499,
    productionLeadDays: 5,
    tags: ['premium'],
    variants: stickerSizes.map((size) => ({
      skuSuffix: size,
      attributes: { finish: 'holographic', size },
      priceAmountMinor: size === '4in' ? 699 : size === '3in' ? 599 : 499,
      weightGrams: 6,
    })),
    printAreas: [
      {
        key: 'face',
        label: { en: 'Face', 'zh-CN': '正面', es: 'Cara', ar: 'الواجهة' },
        widthPx: 1200,
        heightPx: 1200,
        allowedPrintMethods: ['uv_printing'],
      },
    ],
    priceTiers: tiers(499),
  },
  {
    slug: 'bumper-sticker',
    category: 'stickers',
    name: {
      en: 'Bumper Sticker',
      'zh-CN': '车贴',
      es: 'Pegatina para coche',
      ar: 'ملصق سيارة',
    },
    description: {
      en: 'Long-format outdoor-grade bumper sticker.',
      'zh-CN': '长条户外耐用车贴。',
      es: 'Pegatina larga para exterior.',
      ar: 'ملصق طويل للسيارة، مناسب للاستخدام الخارجي.',
    },
    supportedPrintMethods: ['uv_printing'],
    gallery: galleryStub('bumper-sticker'),
    basePriceAmountMinor: 599,
    productionLeadDays: 5,
    tags: ['outdoor'],
    variants: ['white', 'black', 'transparent'].map((color) => ({
      skuSuffix: color,
      attributes: { color, size: '11x3in' },
      priceAmountMinor: 599,
      weightGrams: 12,
    })),
    printAreas: [
      {
        key: 'face',
        label: { en: 'Face', 'zh-CN': '正面', es: 'Cara', ar: 'الواجهة' },
        widthPx: 3300,
        heightPx: 900,
        allowedPrintMethods: ['uv_printing'],
      },
    ],
    priceTiers: tiers(599),
  },
];
