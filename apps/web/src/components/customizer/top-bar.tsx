'use client';

import { Button } from '@custom-merch/ui';
import { ArrowLeft, Eye, Save, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export interface CustomizerTopBarProps {
  productSlug: string;
  productName: string;
  onSave: () => void;
  onPreview: () => void;
  onAddToCart: () => void;
}

export function CustomizerTopBar({
  productSlug,
  productName,
  onSave,
  onPreview,
  onAddToCart,
}: CustomizerTopBarProps): JSX.Element {
  const t = useTranslations('customizer.topBar');

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/products/${productSlug}`}>
            <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
            {t('back')}
          </Link>
        </Button>
        <span className="hidden text-sm font-semibold sm:inline">{productName}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={onSave}>
          <Save className="me-2 h-4 w-4" />
          {t('saveDraft')}
        </Button>
        <Button variant="outline" size="sm" onClick={onPreview}>
          <Eye className="me-2 h-4 w-4" />
          {t('preview')}
        </Button>
        <Button size="sm" onClick={onAddToCart}>
          <ShoppingCart className="me-2 h-4 w-4" />
          {t('addToCart')}
        </Button>
      </div>
    </header>
  );
}
