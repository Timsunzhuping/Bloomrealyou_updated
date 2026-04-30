'use client';

import { Button, QuantitySelector } from '@custom-merch/ui';
import { Truck } from 'lucide-react';
import { useTranslations } from 'next-intl';

export interface CustomizerBottomBarProps {
  quantity: number;
  onQuantityChange: (next: number) => void;
  /** Pre-formatted total price string supplied by the parent. */
  totalLabel: string;
  /** Production lead time in business days from the loaded product. */
  leadDays: number;
  onAddToCart: () => void;
}

export function CustomizerBottomBar({
  quantity,
  onQuantityChange,
  totalLabel,
  leadDays,
  onAddToCart,
}: CustomizerBottomBarProps): JSX.Element {
  const t = useTranslations('customizer.bottomBar');

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-background px-4 py-3">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{t('quantity')}</span>
          <QuantitySelector
            value={quantity}
            onChange={onQuantityChange}
            labels={{ decrement: '−', increment: '+', input: t('quantity') }}
          />
        </div>
        <div className="flex flex-col text-sm">
          <span className="text-xs text-muted-foreground">{t('currentPrice')}</span>
          <span className="text-base font-semibold">{totalLabel}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Truck className="h-3.5 w-3.5" />
          <span>{t('estimatedDelivery')}:</span>
          <span className="font-medium text-foreground">
            {t('deliveryWindow', { days: leadDays + 4 })}
          </span>
        </div>
      </div>
      <Button onClick={onAddToCart} size="lg">
        {t('addToCart')}
      </Button>
    </footer>
  );
}
