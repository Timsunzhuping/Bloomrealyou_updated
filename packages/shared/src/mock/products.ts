/**
 * Deterministic in-memory product catalog used by the API as seed data and by
 * the web app as a fallback when the API is unavailable. The shape mirrors
 * the production entity types in `../types/product.ts` so the same code can
 * consume mock or real data without a refactor when WP-02 / WP-06 ship a
 * real Prisma-backed implementation.
 */
import { PRINT_METHODS, PRODUCT_CATEGORIES } from '../constants';
import type {
  Product,
  ProductId,
  ProductPriceTier,
  ProductPriceTierId,
  ProductPrintArea,
  ProductPrintAreaId,
  ProductVariant,
  ProductVariantId,
} from '../types/product';

const NOW = '2026-04-26T00:00:00.000Z';

/**
 * Fixed image placeholder used by mock products. Real product imagery lives
 * in object storage and is referenced by URL.
 */
const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>',
  );

/** Price tier templates reused across products. amounts are in USD minor units. */
function priceTiers(productId: ProductId, basePriceCents: number): ProductPriceTier[] {
  const id = (n: string): ProductPriceTierId => `${productId}-tier-${n}` as ProductPriceTierId;
  return [
    {
      id: id('1'),
      productId,
      minQuantity: 1,
      maxQuantity: 24,
      unitPrice: { amountMinor: basePriceCents, currency: 'USD' },
    },
    {
      id: id('2'),
      productId,
      minQuantity: 25,
      maxQuantity: 99,
      unitPrice: { amountMinor: Math.round(basePriceCents * 0.85), currency: 'USD' },
    },
    {
      id: id('3'),
      productId,
      minQuantity: 100,
      maxQuantity: null,
      unitPrice: { amountMinor: Math.round(basePriceCents * 0.7), currency: 'USD' },
    },
  ];
}

const COLORS = [
  { value: 'black', label: 'Black' },
  { value: 'white', label: 'White' },
  { value: 'navy', label: 'Navy' },
  { value: 'red', label: 'Red' },
  { value: 'forest', label: 'Forest' },
] as const;

interface CategoryConfig {
  category: (typeof PRODUCT_CATEGORIES)[number];
  basePriceCents: number;
  productionLeadDays: number;
  printAreaKeys: string[];
  sizes?: string[];
  printMethods: Array<(typeof PRINT_METHODS)[number]>;
  /** 3 product variants of this category, with localized names. */
  products: Array<{
    slug: string;
    nameEn: string;
    nameZh: string;
    nameEs: string;
    nameAr: string;
    descriptionEn: string;
    descriptionZh: string;
    descriptionEs: string;
    descriptionAr: string;
    tags: string[];
  }>;
}

const CATEGORIES: CategoryConfig[] = [
  {
    category: 't-shirts',
    basePriceCents: 1999,
    productionLeadDays: 5,
    printAreaKeys: ['front', 'back', 'left_sleeve'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    printMethods: ['dtg', 'screen_printing', 'heat_transfer'],
    products: [
      {
        slug: 'classic-cotton-tee',
        nameEn: 'Classic Cotton Tee',
        nameZh: '经典棉质 T 恤',
        nameEs: 'Camiseta de algodón clásica',
        nameAr: 'تيشيرت قطن كلاسيكي',
        descriptionEn: '180gsm soft-spun cotton, unisex fit, ready for full-color print.',
        descriptionZh: '180g 柔纺棉，男女通穿版，适合全彩印刷。',
        descriptionEs: 'Algodón hilado suave 180gsm, corte unisex, listo para impresión a todo color.',
        descriptionAr: 'قطن ناعم 180 جم، مقاس مناسب للجنسين، جاهز للطباعة الكاملة بالألوان.',
        tags: ['unisex', 'cotton'],
      },
      {
        slug: 'premium-organic-tee',
        nameEn: 'Premium Organic Tee',
        nameZh: '高级有机棉 T 恤',
        nameEs: 'Camiseta orgánica premium',
        nameAr: 'تيشيرت عضوي فاخر',
        descriptionEn: 'GOTS-certified organic cotton, heavyweight 220gsm, eco-friendly dyes.',
        descriptionZh: 'GOTS 认证有机棉，220g 重磅，环保染料。',
        descriptionEs: 'Algodón orgánico certificado GOTS, 220 gsm, tintes eco-friendly.',
        descriptionAr: 'قطن عضوي معتمد GOTS، 220 جم، أصباغ صديقة للبيئة.',
        tags: ['organic', 'heavyweight'],
      },
      {
        slug: 'performance-tee',
        nameEn: 'Performance Athletic Tee',
        nameZh: '高性能运动 T 恤',
        nameEs: 'Camiseta deportiva de rendimiento',
        nameAr: 'تيشيرت رياضي عالي الأداء',
        descriptionEn: 'Moisture-wicking polyester blend ideal for team sports and events.',
        descriptionZh: '吸湿排汗聚酯混纺，适合团队运动和活动。',
        descriptionEs: 'Mezcla de poliéster que absorbe la humedad, ideal para deportes y eventos.',
        descriptionAr: 'مزيج بوليستر يمتص الرطوبة، مثالي للرياضات الجماعية والفعاليات.',
        tags: ['athletic', 'moisture-wicking'],
      },
    ],
  },
  {
    category: 'hoodies',
    basePriceCents: 4499,
    productionLeadDays: 7,
    printAreaKeys: ['front', 'back'],
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    printMethods: ['screen_printing', 'embroidery', 'dtg'],
    products: [
      {
        slug: 'classic-pullover-hoodie',
        nameEn: 'Classic Pullover Hoodie',
        nameZh: '经典套头连帽卫衣',
        nameEs: 'Sudadera clásica con capucha',
        nameAr: 'هودي كلاسيكي',
        descriptionEn: '50/50 cotton-poly blend, kangaroo pocket, double-needle stitching.',
        descriptionZh: '50/50 棉聚酯混纺，袋鼠口袋，双针缝合。',
        descriptionEs: 'Mezcla 50/50 algodón-poliéster, bolsillo canguro, costura doble.',
        descriptionAr: 'مزيج قطن وبوليستر 50/50، جيب كنغر، خياطة مزدوجة.',
        tags: ['unisex'],
      },
      {
        slug: 'heavyweight-zip-hoodie',
        nameEn: 'Heavyweight Zip Hoodie',
        nameZh: '重磅拉链连帽衫',
        nameEs: 'Sudadera con cremallera de peso pesado',
        nameAr: 'هودي ثقيل بسحاب',
        descriptionEn: '380gsm fleece, brushed inside, full YKK zipper.',
        descriptionZh: '380g 加绒，内部刷毛，YKK 全长拉链。',
        descriptionEs: 'Forro polar de 380 gsm, interior cepillado, cremallera YKK completa.',
        descriptionAr: 'صوف 380 جم، داخل مفروش، سحاب YKK كامل.',
        tags: ['heavyweight', 'zip'],
      },
      {
        slug: 'cropped-fashion-hoodie',
        nameEn: 'Cropped Fashion Hoodie',
        nameZh: '短款时尚连帽衫',
        nameEs: 'Sudadera con capucha cropped',
        nameAr: 'هودي قصير عصري',
        descriptionEn: 'Modern cropped silhouette with raw-edge hem and ribbed sleeves.',
        descriptionZh: '现代短款剪裁，毛边下摆，罗纹袖口。',
        descriptionEs: 'Silueta cropped moderna con dobladillo crudo y mangas acanaladas.',
        descriptionAr: 'قصة قصيرة عصرية مع حافة أمامية وأكمام مضلعة.',
        tags: ['fashion', 'cropped'],
      },
    ],
  },
  {
    category: 'mugs',
    basePriceCents: 1099,
    productionLeadDays: 4,
    printAreaKeys: ['wrap'],
    printMethods: ['sublimation', 'uv_printing'],
    products: [
      {
        slug: 'ceramic-coffee-mug-11oz',
        nameEn: 'Ceramic Coffee Mug — 11oz',
        nameZh: '陶瓷咖啡杯 — 11 盎司',
        nameEs: 'Taza de cerámica — 325 ml',
        nameAr: 'كوب سيراميك للقهوة — 325 مل',
        descriptionEn: 'Glossy white ceramic, dishwasher and microwave safe, full wrap-around print.',
        descriptionZh: '亮面白色陶瓷，可洗碗机微波炉使用，环绕全印刷。',
        descriptionEs: 'Cerámica blanca brillante, apta para lavavajillas y microondas, impresión completa.',
        descriptionAr: 'سيراميك أبيض لامع، مناسب لغسالة الصحون والميكروويف، طباعة محيطية كاملة.',
        tags: ['ceramic', 'office'],
      },
      {
        slug: 'travel-tumbler-15oz',
        nameEn: 'Travel Tumbler — 15oz',
        nameZh: '便携旅行杯 — 15 盎司',
        nameEs: 'Taza de viaje — 440 ml',
        nameAr: 'كوب سفر — 440 مل',
        descriptionEn: 'Stainless steel, double-walled, leak-proof lid for on-the-go branding.',
        descriptionZh: '不锈钢双层，防漏盖，外出携带的优选品牌礼。',
        descriptionEs: 'Acero inoxidable, doble pared, tapa antifugas para branding en movimiento.',
        descriptionAr: 'فولاذ مقاوم للصدأ، جدار مزدوج، غطاء مانع للتسرب للترويج أثناء التنقل.',
        tags: ['travel', 'insulated'],
      },
      {
        slug: 'enamel-camp-mug',
        nameEn: 'Enamel Camp Mug',
        nameZh: '搪瓷露营杯',
        nameEs: 'Taza esmaltada de camping',
        nameAr: 'كوب تخييم مينا',
        descriptionEn: 'Vintage-style enamel mug with stainless rim, perfect for outdoor brand bundles.',
        descriptionZh: '复古搪瓷杯，不锈钢边沿，户外品牌礼品组合的理想选择。',
        descriptionEs: 'Taza esmaltada vintage con borde de acero, ideal para packs outdoor.',
        descriptionAr: 'كوب مينا بتصميم كلاسيكي وحافة من الفولاذ، مثالي لباقات الترويج الخارجية.',
        tags: ['outdoor', 'vintage'],
      },
    ],
  },
  {
    category: 'hats',
    basePriceCents: 1799,
    productionLeadDays: 6,
    printAreaKeys: ['face', 'back'],
    printMethods: ['embroidery', 'heat_transfer'],
    products: [
      {
        slug: 'classic-six-panel-cap',
        nameEn: 'Classic 6-Panel Cap',
        nameZh: '经典六片帽',
        nameEs: 'Gorra clásica de 6 paneles',
        nameAr: 'كاب كلاسيكي بستة أجزاء',
        descriptionEn: 'Structured front, adjustable strap, mid-profile crown for embroidery.',
        descriptionZh: '前片硬挺，可调节后带，中等前帽身适合刺绣。',
        descriptionEs: 'Frente estructurado, correa ajustable, corona media perfecta para bordados.',
        descriptionAr: 'مقدمة منظمة، حزام قابل للتعديل، تاج متوسط مناسب للتطريز.',
        tags: ['cap', 'embroidered'],
      },
      {
        slug: 'unstructured-dad-hat',
        nameEn: 'Unstructured Dad Hat',
        nameZh: '柔顶老爹帽',
        nameEs: 'Gorra dad hat sin estructura',
        nameAr: 'كاب داد غير منظم',
        descriptionEn: 'Soft brushed cotton with low-profile silhouette and curved bill.',
        descriptionZh: '柔软刷棉，低顶轮廓，弧形帽檐。',
        descriptionEs: 'Algodón cepillado suave con silueta baja y visera curva.',
        descriptionAr: 'قطن ناعم مفروش مع تصميم منخفض ومقدمة منحنية.',
        tags: ['dad-hat'],
      },
      {
        slug: 'snapback-flatbill',
        nameEn: 'Snapback Flat Bill',
        nameZh: '平檐 Snapback 帽',
        nameEs: 'Snapback con visera plana',
        nameAr: 'كاب سناب باك بحافة مسطحة',
        descriptionEn: 'High-crown flat bill cap with snap closure, ideal for streetwear branding.',
        descriptionZh: '高顶平檐帽，按扣后封，街头风格品牌的最佳之选。',
        descriptionEs: 'Gorra de visera plana con cierre snap, perfecta para streetwear.',
        descriptionAr: 'كاب بحافة مسطحة وإغلاق سناب، مثالي للترويج لشارع الموضة.',
        tags: ['streetwear', 'snapback'],
      },
    ],
  },
  {
    category: 'tote-bags',
    basePriceCents: 1299,
    productionLeadDays: 5,
    printAreaKeys: ['front', 'back'],
    printMethods: ['screen_printing', 'dtg'],
    products: [
      {
        slug: 'natural-canvas-tote',
        nameEn: 'Natural Canvas Tote',
        nameZh: '本色帆布托特包',
        nameEs: 'Bolsa de lona natural',
        nameAr: 'حقيبة قماش طبيعي',
        descriptionEn: '12oz heavyweight natural canvas, reinforced shoulder straps.',
        descriptionZh: '12oz 重磅本色帆布，加固肩带。',
        descriptionEs: 'Lona natural de 12 oz, asas reforzadas.',
        descriptionAr: 'قماش طبيعي 12 أونصة، مقابض كتف مدعمة.',
        tags: ['canvas'],
      },
      {
        slug: 'organic-cotton-tote',
        nameEn: 'Organic Cotton Tote',
        nameZh: '有机棉托特包',
        nameEs: 'Bolsa de algodón orgánico',
        nameAr: 'حقيبة قطن عضوي',
        descriptionEn: 'GOTS-certified organic cotton with reinforced bottom and inner pocket.',
        descriptionZh: 'GOTS 认证有机棉，加固底部，内置口袋。',
        descriptionEs: 'Algodón orgánico GOTS con base reforzada y bolsillo interior.',
        descriptionAr: 'قطن عضوي معتمد مع قاع مدعم وجيب داخلي.',
        tags: ['organic'],
      },
      {
        slug: 'foldable-event-tote',
        nameEn: 'Foldable Event Tote',
        nameZh: '可折叠活动托特包',
        nameEs: 'Bolsa plegable para eventos',
        nameAr: 'حقيبة فعاليات قابلة للطي',
        descriptionEn: 'Lightweight ripstop polyester that folds into its own pouch — great giveaways.',
        descriptionZh: '轻量防撕裂聚酯纤维，可折叠收纳进自带小袋，活动赠品首选。',
        descriptionEs: 'Poliéster ripstop ligero plegable en su propio estuche — ideal como regalo.',
        descriptionAr: 'بوليستر خفيف يطوى داخل جرابه الخاص — مثالي للتذكارات.',
        tags: ['event', 'foldable'],
      },
    ],
  },
  {
    category: 'stickers',
    basePriceCents: 299,
    productionLeadDays: 3,
    printAreaKeys: ['front'],
    printMethods: ['uv_printing', 'heat_transfer'],
    products: [
      {
        slug: 'die-cut-vinyl-sticker',
        nameEn: 'Die-Cut Vinyl Sticker',
        nameZh: '刀模切割乙烯贴纸',
        nameEs: 'Pegatina de vinilo troquelada',
        nameAr: 'ملصق فينيل مقصوص',
        descriptionEn: 'Weatherproof premium vinyl with custom die-cut shapes.',
        descriptionZh: '防水高级乙烯贴纸，可定制异形切割。',
        descriptionEs: 'Vinilo resistente a la intemperie con corte a medida.',
        descriptionAr: 'فينيل ممتاز مقاوم للعوامل الجوية مع قص مخصص.',
        tags: ['vinyl', 'waterproof'],
      },
      {
        slug: 'transparent-clear-sticker',
        nameEn: 'Transparent Clear Sticker',
        nameZh: '透明贴纸',
        nameEs: 'Pegatina transparente',
        nameAr: 'ملصق شفاف',
        descriptionEn: 'See-through PET film, ideal for laptops, water bottles, and packaging.',
        descriptionZh: '透明 PET 膜，适合笔记本电脑、水瓶和包装。',
        descriptionEs: 'Película PET transparente, perfecta para laptops, botellas y packaging.',
        descriptionAr: 'فيلم PET شفاف، مثالي للحواسيب المحمولة وقوارير الماء والتغليف.',
        tags: ['transparent'],
      },
      {
        slug: 'holographic-sticker',
        nameEn: 'Holographic Sticker',
        nameZh: '镭射全息贴纸',
        nameEs: 'Pegatina holográfica',
        nameAr: 'ملصق هولوغرام',
        descriptionEn: 'Eye-catching holographic finish that shifts color in the light.',
        descriptionZh: '吸睛全息工艺，光线下颜色变幻。',
        descriptionEs: 'Acabado holográfico llamativo que cambia de color con la luz.',
        descriptionAr: 'تشطيب هولوغرافي جذاب يتغير لونه مع الإضاءة.',
        tags: ['holographic', 'premium'],
      },
    ],
  },
];

interface MockProductBundle {
  product: Product;
  variants: ProductVariant[];
  printAreas: ProductPrintArea[];
  priceTiers: ProductPriceTier[];
}

function buildBundle(
  config: CategoryConfig,
  prod: CategoryConfig['products'][number],
): MockProductBundle {
  const productId = `prod_${prod.slug}` as ProductId;
  const variants: ProductVariant[] = [];
  const sizes = config.sizes ?? [];

  if (sizes.length > 0) {
    for (const c of COLORS.slice(0, 4)) {
      for (const s of sizes) {
        const id = `var_${prod.slug}_${c.value}_${s}` as ProductVariantId;
        variants.push({
          id,
          productId,
          sku: `${prod.slug.toUpperCase()}-${c.value.toUpperCase()}-${s}`,
          attributes: { color: c.value, colorLabel: c.label, size: s },
          price: { amountMinor: config.basePriceCents, currency: 'USD' },
          isActive: true,
          createdAt: NOW,
          updatedAt: NOW,
        });
      }
    }
  } else {
    // Single-axis variants (e.g. mugs, stickers): just colors.
    for (const c of COLORS.slice(0, 3)) {
      const id = `var_${prod.slug}_${c.value}` as ProductVariantId;
      variants.push({
        id,
        productId,
        sku: `${prod.slug.toUpperCase()}-${c.value.toUpperCase()}`,
        attributes: { color: c.value, colorLabel: c.label },
        price: { amountMinor: config.basePriceCents, currency: 'USD' },
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      });
    }
  }

  const printAreas: ProductPrintArea[] = config.printAreaKeys.map((key, idx) => ({
    id: `area_${prod.slug}_${key}` as ProductPrintAreaId,
    productId,
    key,
    label: { en: key, 'zh-CN': key, es: key, ar: key },
    widthPx: 3000,
    heightPx: 3000,
    mockupOffsetXPx: 200 + idx * 50,
    mockupOffsetYPx: 200,
    allowedPrintMethods: config.printMethods,
  }));

  const product: Product = {
    id: productId,
    slug: prod.slug,
    category: config.category,
    status: 'active',
    name: { en: prod.nameEn, 'zh-CN': prod.nameZh, es: prod.nameEs, ar: prod.nameAr },
    description: {
      en: prod.descriptionEn,
      'zh-CN': prod.descriptionZh,
      es: prod.descriptionEs,
      ar: prod.descriptionAr,
    },
    supportedPrintMethods: config.printMethods,
    imageUrls: [PLACEHOLDER_IMG, PLACEHOLDER_IMG, PLACEHOLDER_IMG],
    basePrice: { amountMinor: config.basePriceCents, currency: 'USD' },
    tags: prod.tags,
    productionLeadDays: config.productionLeadDays,
    createdAt: NOW,
    updatedAt: NOW,
  };

  return { product, variants, printAreas, priceTiers: priceTiers(productId, config.basePriceCents) };
}

const BUNDLES: MockProductBundle[] = CATEGORIES.flatMap((c) =>
  c.products.map((p) => buildBundle(c, p)),
);

/** All mock products. */
export const MOCK_PRODUCTS: readonly Product[] = BUNDLES.map((b) => b.product);

/** Lookup mock product by slug. */
export function findMockProductBySlug(slug: string): MockProductBundle | undefined {
  return BUNDLES.find((b) => b.product.slug === slug);
}

/** Find product bundle by id. */
export function findMockProductById(id: string): MockProductBundle | undefined {
  return BUNDLES.find((b) => b.product.id === id);
}

/** Filter products by category. */
export function listMockProducts(filters?: { category?: string }): Product[] {
  if (!filters?.category) return [...MOCK_PRODUCTS];
  return MOCK_PRODUCTS.filter((p) => p.category === filters.category);
}

/** Color options aggregated from variants — exposed for UI filters. */
export const MOCK_COLOR_OPTIONS = COLORS.map((c) => ({ value: c.value, label: c.label }));

export type { MockProductBundle };
