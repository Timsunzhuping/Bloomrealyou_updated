import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  DESIGN_STATUSES,
  type AdminDesignReviewDto,
  type DesignStatus,
} from '@custom-merch/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@custom-merch/ui';
import { ImageOff } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { ReviewActions } from '@/components/design-reviews/review-actions';
import { Link } from '@/i18n/navigation';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

const DEFAULT_STATUS: DesignStatus = 'submitted';

export default async function AdminDesignReviewsPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const status = (DESIGN_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as DesignStatus)
    : DEFAULT_STATUS;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminDesignReviewDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminDesignReviews.list({ status, page, pageSize: 20 });
    rows = result.items;
    total = result.total;
    pageSize = result.pageSize;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  const apiBaseUrl = getApiBaseUrl();

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">{t('designReviews.heading')}</h1>
        <p className="text-muted-foreground">{t('designReviews.subtitle')}</p>
      </header>

      <form className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('designReviews.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            {DESIGN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`designReviews.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t('designReviews.filter.apply')}
        </Button>
      </form>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('designReviews.empty')}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {rows.map((design) => (
            <Card key={design.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-base">{design.name}</CardTitle>
                  <p className="font-mono text-[11px] text-muted-foreground">{design.id}</p>
                  {design.linkedOrderNumber && (
                    <p className="text-xs">
                      <Link
                        href={`/orders/${design.linkedOrderId}`}
                        className="text-primary hover:underline"
                      >
                        {design.linkedOrderNumber}
                      </Link>
                    </p>
                  )}
                </div>
                <Badge variant="secondary">
                  {t(`designReviews.statusLabels.${design.status}`)}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 lg:grid-cols-[200px_1fr_minmax(280px,360px)]">
                  <div className="space-y-2">
                    {design.previewImageUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={design.previewImageUrl}
                          alt=""
                          className="aspect-square w-full rounded border object-contain bg-muted/30 p-2"
                        />
                      </>
                    ) : (
                      <div className="grid aspect-square w-full place-items-center rounded border bg-muted/30 text-muted-foreground">
                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                      </div>
                    )}
                    {design.productionFileUrl && (
                      <a
                        href={design.productionFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        {t('designReviews.productionFile')}
                      </a>
                    )}
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {t('designReviews.designJson')}
                      </p>
                      <pre className="mt-1 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[11px]">
                        {JSON.stringify(design.designJson, null, 2).slice(0, 1500)}
                      </pre>
                    </div>
                    {design.validationResult && (
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {t('designReviews.validation')}
                        </p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded border bg-muted/30 p-2 font-mono text-[11px]">
                          {JSON.stringify(design.validationResult, null, 2).slice(0, 800)}
                        </pre>
                      </div>
                    )}
                    {design.reviewerNotes && (
                      <div className="rounded border border-amber-500/30 bg-amber-50 p-2 text-xs">
                        <p className="font-medium">{t('designReviews.reviewerNotes')}</p>
                        <p className="whitespace-pre-wrap">{design.reviewerNotes}</p>
                      </div>
                    )}
                  </div>

                  <ReviewActions design={design} apiBaseUrl={apiBaseUrl} />
                </div>
              </CardContent>
            </Card>
          ))}
        </ul>
      )}

      <PaginationBar page={page} pageSize={pageSize} total={total} params={{ status }} />
    </section>
  );
}
