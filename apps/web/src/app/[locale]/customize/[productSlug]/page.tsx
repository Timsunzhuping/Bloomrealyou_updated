import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { Button } from '@custom-merch/ui';
import { Sparkles } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string; productSlug: string }>;
}

/**
 * Placeholder route for the in-browser 2D customizer that ships in WP-08.
 * Today it confirms the routing contract — the page exists at
 * /[locale]/customize/[productSlug] and `Customize Now` lands here.
 */
export default async function CustomizePlaceholder({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, productSlug } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const tCustomizer = await getTranslations({ locale, namespace: 'customizer' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <section className="space-y-6 py-12 text-center">
      <Sparkles className="mx-auto h-12 w-12 text-accent" aria-hidden="true" />
      <h1 className="text-3xl font-bold tracking-tight">{tCustomizer('title')}</h1>
      <p className="text-muted-foreground">{tCustomizer('panels.ai')}</p>
      <p className="text-sm text-muted-foreground">{productSlug}</p>
      <div className="flex justify-center gap-3">
        <Button asChild>
          <Link href={`/products/${productSlug}`}>{tCommon('actions.back')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/products">{tCommon('nav.products')}</Link>
        </Button>
      </div>
    </section>
  );
}
