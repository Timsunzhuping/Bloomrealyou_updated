'use client';

import { formatLocalisedDate, type Locale } from '@custom-merch/i18n';
import type { CustomerDesignDto } from '@custom-merch/shared';
import { Button, EmptyState, ErrorState, LoadingState } from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Link, useRouter } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="%23e5e7eb"/></svg>',
  );

export function AccountDesignsList({ locale }: { locale: Locale }): JSX.Element {
  const t = useTranslations('account.designs');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [designs, setDesigns] = React.useState<CustomerDesignDto[] | null>(null);
  const [error, setError] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getClientApi().account.listDesigns();
        if (!cancelled) setDesigns(list);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onReorder = async (id: string): Promise<void> => {
    setPendingId(id);
    try {
      await getClientApi().account.reorder(id);
      setToast(t('addedToCart'));
      router.push('/cart');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[account] reorder failed', (err as Error).message);
      setToast(t('reorderFailed'));
    } finally {
      setPendingId(null);
    }
  };

  if (error) return <ErrorState title={t('empty')} />;
  if (!designs) return <LoadingState label={tCommon('states.loading')} />;
  if (designs.length === 0) {
    return (
      <EmptyState
        title={t('empty')}
        action={
          <Button asChild>
            <Link href="/products">{tCommon('nav.products')}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="space-y-4">
      {toast && (
        <div className="rounded-md bg-foreground px-4 py-2 text-center text-xs text-background">
          {toast}
        </div>
      )}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((design) => (
          <li key={design.id} className="flex flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="aspect-square bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={design.previewImageUrl ?? PLACEHOLDER_IMG}
                alt={design.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-sm font-semibold">{design.name}</p>
              <p className="text-xs text-muted-foreground">
                {t('savedAt', {
                  date: formatLocalisedDate(design.createdAt, locale, 'short-date'),
                })}
              </p>
              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/customize/${design.productId}?designId=${design.id}`}>
                    {t('edit')}
                  </Link>
                </Button>
                <Button
                  size="sm"
                  onClick={() => void onReorder(design.id)}
                  disabled={pendingId === design.id}
                >
                  {pendingId === design.id ? t('reordering') : t('reorder')}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
