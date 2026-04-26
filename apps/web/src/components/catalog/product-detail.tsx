'use client';

import { formatCurrency, type Locale } from '@custom-merch/i18n';
import type {
  Product,
  ProductPriceTier,
  ProductPrintArea,
  ProductVariant,
} from '@custom-merch/shared';
import {
  Badge,
  Breadcrumb,
  Button,
  ImagePreview,
  PriceDisplay,
  QuantitySelector,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';

export interface ProductDetailProps {
  locale: Locale;
  product: Product;
  variants: ProductVariant[];
  printAreas: ProductPrintArea[];
  priceTiers: ProductPriceTier[];
}

interface VariantAxes {
  colors: Array<{ value: string; label: string }>;
  sizes: string[];
}

function deriveAxes(variants: ProductVariant[]): VariantAxes {
  const colors = new Map<string, string>();
  const sizes = new Set<string>();
  for (const v of variants) {
    const c = v.attributes.color;
    if (c) colors.set(c, v.attributes.colorLabel ?? c);
    const s = v.attributes.size;
    if (s) sizes.add(s);
  }
  return {
    colors: Array.from(colors, ([value, label]) => ({ value, label })),
    sizes: Array.from(sizes),
  };
}

export function ProductDetail({
  locale,
  product,
  variants,
  printAreas,
  priceTiers,
}: ProductDetailProps): JSX.Element {
  const t = useTranslations('products.detail');
  const tProducts = useTranslations('products');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const axes = React.useMemo(() => deriveAxes(variants), [variants]);
  const [color, setColor] = React.useState(axes.colors[0]?.value ?? '');
  const [size, setSize] = React.useState(axes.sizes[0] ?? '');
  const [quantity, setQuantity] = React.useState(1);

  const selectedVariant = variants.find(
    (v) => v.attributes.color === color && (axes.sizes.length === 0 || v.attributes.size === size),
  );

  const localizedName = product.name[locale] ?? product.name.en;
  const localizedDescription = product.description[locale] ?? product.description.en;

  function onCustomize(): void {
    const params = new URLSearchParams();
    if (selectedVariant) params.set('variant', selectedVariant.id);
    if (quantity > 1) params.set('qty', String(quantity));
    const qs = params.toString();
    router.push(`/customize/${product.slug}${qs ? `?${qs}` : ''}`);
  }

  return (
    <div className="space-y-8 pb-12">
      <Breadcrumb
        ariaLabel={tCommon('nav.home')}
        items={[
          { label: t('breadcrumbs.home'), href: '/' },
          { label: t('breadcrumbs.products'), href: '/products' },
          {
            label: tProducts(`categories.${product.category}.name`),
            href: `/custom-${product.category}`,
          },
          { label: localizedName },
        ]}
        renderLink={(item, c) => <Link href={item.href as string}>{c}</Link>}
      />

      <div className="grid gap-8 md:grid-cols-2">
        <ImagePreview
          images={product.imageUrls.map((src) => ({ src, alt: localizedName }))}
          thumbnailListLabel={localizedName}
        />

        <div className="space-y-6">
          <header className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">{localizedName}</h1>
            <PriceDisplay
              amount={formatCurrency(product.basePrice, locale)}
              prefix={t('fromPrice')}
              suffix={t('perUnit')}
              size="lg"
            />
            <p className="text-muted-foreground">{localizedDescription}</p>
          </header>

          {axes.colors.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">{t('selectColor')}</legend>
              <div className="flex flex-wrap gap-2">
                {axes.colors.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    aria-pressed={color === c.value}
                    className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      color === c.value
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {tProducts(`colors.${c.value}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {axes.sizes.length > 0 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-semibold">{t('selectSize')}</legend>
              <div className="flex flex-wrap gap-2">
                {axes.sizes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={size === s}
                    className={`min-w-[3rem] rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      size === s
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold">{t('selectQuantity')}</p>
            <QuantitySelector
              value={quantity}
              onChange={setQuantity}
              labels={{
                decrement: tCommon('actions.back'),
                increment: tCommon('actions.continue'),
                input: t('selectQuantity'),
              }}
            />
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-start gap-2">
              <span className="font-semibold">{t('supportedPrintMethods')}:</span>
              <span className="flex flex-wrap gap-1">
                {product.supportedPrintMethods.map((m) => (
                  <Badge key={m} variant="secondary">
                    {tProducts(`printMethods.${m}`)}
                  </Badge>
                ))}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="font-semibold">{t('printAreas')}:</span>
              <span className="text-muted-foreground">
                {printAreas.map((a) => a.key).join(', ')}
              </span>
            </div>
            <p className="text-muted-foreground">
              {t('productionLeadDays', { days: product.productionLeadDays })}
            </p>
            <p className="text-muted-foreground">{t('shippingLead')}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={onCustomize}>
              {t('customize')}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/business?productSlug=${product.slug}`}>{t('requestBulkQuote')}</Link>
            </Button>
          </div>

          {priceTiers.length > 0 && (
            <section className="space-y-3 rounded-lg border p-4">
              <h2 className="text-sm font-semibold">{t('priceTiersHeading')}</h2>
              <ul className="space-y-1.5 text-sm">
                {priceTiers.map((tier) => {
                  const range = tier.maxQuantity
                    ? t('priceTiers.minMaxQty', { min: tier.minQuantity, max: tier.maxQuantity })
                    : t('priceTiers.minQty', { min: tier.minQuantity });
                  const price = t('priceTiers.unitPrice', {
                    price: formatCurrency(tier.unitPrice, locale),
                  });
                  return (
                    <li
                      key={tier.id}
                      className="flex items-center justify-between border-b pb-1.5 last:border-0 last:pb-0"
                    >
                      <span>{range}</span>
                      <span className="font-medium">{price}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t('tabs.details')}</TabsTrigger>
          <TabsTrigger value="files">{t('tabs.files')}</TabsTrigger>
          <TabsTrigger value="shipping">{t('tabs.shipping')}</TabsTrigger>
          <TabsTrigger value="faq">{t('tabs.faq')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-3 rounded-lg border p-6 text-sm">
          <h2 className="text-base font-semibold">{localizedName}</h2>
          <p className="text-muted-foreground">{localizedDescription}</p>
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="files" className="space-y-3 rounded-lg border p-6 text-sm">
          <h2 className="text-base font-semibold">{t('fileRequirements.heading')}</h2>
          <ul className="list-disc space-y-1.5 ps-5 text-muted-foreground">
            <li>{t('fileRequirements.items.format')}</li>
            <li>{t('fileRequirements.items.resolution')}</li>
            <li>{t('fileRequirements.items.color')}</li>
            <li>{t('fileRequirements.items.size')}</li>
          </ul>
        </TabsContent>

        <TabsContent value="shipping" className="space-y-3 rounded-lg border p-6 text-sm">
          <h2 className="text-base font-semibold">{t('shippingPolicy.heading')}</h2>
          <ul className="list-disc space-y-1.5 ps-5 text-muted-foreground">
            <li>{t('shippingPolicy.items.shipping')}</li>
            <li>{t('shippingPolicy.items.tracking')}</li>
            <li>{t('shippingPolicy.items.returns')}</li>
            <li>{t('shippingPolicy.items.contact')}</li>
          </ul>
        </TabsContent>

        <TabsContent value="faq" className="space-y-3 rounded-lg border p-6 text-sm">
          <h2 className="text-base font-semibold">{t('faq.heading')}</h2>
          <dl className="space-y-3">
            <FaqItem question={t('faq.items.q1')} answer={t('faq.items.a1')} />
            <FaqItem question={t('faq.items.q2')} answer={t('faq.items.a2')} />
            <FaqItem question={t('faq.items.q3')} answer={t('faq.items.a3')} />
          </dl>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }): JSX.Element {
  return (
    <div>
      <dt className="font-medium">{question}</dt>
      <dd className="text-muted-foreground">{answer}</dd>
    </div>
  );
}
