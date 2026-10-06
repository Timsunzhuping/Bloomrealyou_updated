import { PRODUCT_CATEGORIES, PRINT_METHODS } from '@custom-merch/shared';

import type { ListingDraft, ProductListingSession } from '@custom-merch/shared';

export function emptyDraft(): ListingDraft {
  return {
    nameZh: '',
    nameEn: '',
    descriptionZh: '',
    descriptionEn: '',
    slug: '',
    category: '',
    price: '',
    currency: 'USD',
    material: '',
    colors: [],
    sizes: [],
    productionLeadDays: null,
    printMethods: [],
    widthPx: null,
    heightPx: null,
    offsetXPx: null,
    offsetYPx: null,
    printAreaConfirmed: false,
  };
}

export function priceMinor(price: string): number | null {
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(price)) return null;
  const [major, decimal = ''] = price.split('.');
  const value = Number(major) * 100 + Number(decimal.padEnd(2, '0'));
  return value > 0 && Number.isSafeInteger(value) ? value : null;
}

export function missingFields(s: ProductListingSession, publish = true): string[] {
  const d = s.draft;
  const missing: string[] = [];
  if (!d.nameEn.trim()) missing.push('nameEn');
  if (!d.category) missing.push('category');
  if (!d.slug) missing.push('slug');
  if (priceMinor(d.price) === null) missing.push('price');
  if (!publish) return missing;
  if (!d.descriptionEn.trim()) missing.push('descriptionEn');
  if (!d.material.trim()) missing.push('material');
  if (!d.colors.length) missing.push('colors');
  if (!d.sizes.length) missing.push('sizes');
  if (d.productionLeadDays === null) missing.push('productionLeadDays');
  if (!s.selectedImageIds.length || !s.mainImageId) missing.push('images');
  if (s.images.some((im) => s.selectedImageIds.includes(im.id) && !im.approved))
    missing.push('imageApproval');
  if (
    d.printMethods.length &&
    (!d.widthPx ||
      !d.heightPx ||
      d.offsetXPx === null ||
      d.offsetYPx === null ||
      !d.printAreaConfirmed)
  )
    missing.push('printArea');
  return missing;
}

export const FIELD_LABELS: Record<string, [string, string]> = {
  nameEn: ['商品英文名称', 'English product name'],
  category: ['商品分类', 'Category'],
  slug: ['商品链接标识', 'Product slug'],
  price: ['售价', 'Price'],
  descriptionEn: ['商品英文描述', 'English description'],
  material: ['材质', 'Material'],
  colors: ['颜色（无颜色区分可填默认）', 'Colors (use Default if not applicable)'],
  sizes: ['尺码/规格（无尺码可填均码）', 'Sizes (use One Size if not applicable)'],
  productionLeadDays: ['生产周期', 'Production lead time'],
  images: ['商品图片与主图', 'Product images and main image'],
  imageApproval: ['优化图片的人工确认', 'Approval of enhanced images'],
  printArea: ['真实印花区域参数与确认', 'Verified print area dimensions and offsets'],
};

export function followUp(s: ProductListingSession): string {
  const zh = s.locale === 'zh-CN';
  const fields = missingFields(s);
  if (!fields.length)
    return zh
      ? '资料已齐全。请核对价格、规格和图片，确认后即可保存草稿或上架。'
      : 'Details are complete. Review the price, variants and images before saving or publishing.';
  return zh
    ? `已整理资料。接下来请补充：${fields.map((f) => FIELD_LABELS[f]?.[0] ?? f).join('、')}。`
    : `Details updated. Please provide: ${fields.map((f) => FIELD_LABELS[f]?.[1] ?? f).join(', ')}.`;
}

/** Explicit labels are also usable when the language model is offline. */
export function guidedPatch(message: string): Partial<ListingDraft> {
  const patch: Partial<ListingDraft> = {};
  const labels: Array<[keyof ListingDraft, string]> = [
    ['nameZh', '商品名称|名称|品名'],
    ['nameEn', '英文名称|English name|name'],
    ['descriptionZh', '中文描述|描述'],
    ['descriptionEn', '英文描述|English description'],
    ['material', '材质|material'],
    ['slug', '链接标识|slug'],
  ];
  for (const [key, label] of labels) {
    const match = message.match(
      new RegExp(`(?:^|[\\n;；])\\s*(?:${label})\\s*[:：]\\s*([^\\n;；]+)`, 'i'),
    );
    if (match) (patch as Record<string, unknown>)[key] = match[1]!.trim();
  }
  const price = message.match(
    /(?:售价|价格|price)\s*[:：]?\s*(?:(USD|EUR|GBP|AED|CNY|美元|人民币)\s*)?(\d{1,7}(?:\.\d{1,2})?)(?![\d.])\s*(USD|EUR|GBP|AED|CNY|美元|人民币)?/i,
  );
  if (price) {
    patch.price = price[2]!;
    const cur = (price[1] ?? price[3])?.toUpperCase();
    if (cur)
      patch.currency = (
        cur === '美元' ? 'USD' : cur === '人民币' ? 'CNY' : cur
      ) as ListingDraft['currency'];
  }
  const lead = message.match(/(?:生产周期|交期|lead time)\s*[:：]?\s*(\d{1,3})\s*(?:天|days?)/i);
  if (lead && Number(lead[1]) <= 365) patch.productionLeadDays = Number(lead[1]);
  for (const [key, label] of [
    ['colors', '颜色|colors?'],
    ['sizes', '尺码|规格|sizes?'],
  ] as const) {
    const match = message.match(
      new RegExp(`(?:^|[\\n;；])\\s*(?:${label})\\s*[:：]\\s*([^\\n;；]+)`, 'i'),
    );
    if (match)
      patch[key] = [
        ...new Set(
          match[1]!
            .split(/[,，、/]/)
            .map((v) => v.trim())
            .filter(Boolean),
        ),
      ].slice(0, 10);
  }
  const category = message.match(/(?:分类|category)\s*[:：]\s*([^\n;；]+)/i)?.[1]?.trim();
  const aliases: Record<string, ListingDraft['category']> = {
    T恤: 't-shirts',
    t恤: 't-shirts',
    卫衣: 'hoodies',
    马克杯: 'mugs',
    帽子: 'hats',
    帆布袋: 'tote-bags',
    贴纸: 'stickers',
  };
  if (category && (PRODUCT_CATEGORIES as readonly string[]).includes(category))
    patch.category = category as ListingDraft['category'];
  else if (category && aliases[category]) patch.category = aliases[category];
  const methods = message
    .match(/(?:工艺|print methods?)\s*[:：]\s*([^\n;；]+)/i)?.[1]
    ?.trim()
    .split(/[,，、/]/)
    .map((v) => v.trim());
  if (methods && methods.every((m) => (PRINT_METHODS as readonly string[]).includes(m)))
    patch.printMethods = methods as ListingDraft['printMethods'];
  return patch;
}
