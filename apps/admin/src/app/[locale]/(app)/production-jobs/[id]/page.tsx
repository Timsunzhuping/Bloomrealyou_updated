import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type {
  AdminProductionJobDto,
  AdminSupplierDto,
  ProductCategory,
} from '@custom-merch/shared';
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@custom-merch/ui';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { JobActions } from '@/components/production/job-actions';
import { Link } from '@/i18n/navigation';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function AdminProductionJobDetailPage({
  params,
}: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  let job: AdminProductionJobDto;
  let suppliers: AdminSupplierDto[] = [];
  let destinationCountry = 'US';
  let productCategory: ProductCategory = 't-shirts';

  try {
    const api = await getAdminApi();
    job = await api.adminProduction.get(id);
    const supplierResult = await api.adminSuppliers.list({ status: 'active', pageSize: 100 });
    suppliers = supplierResult.items;

    const order = await api.adminOrders.get(job.orderId);
    destinationCountry = order.shippingAddress.country.toUpperCase();
    if (job.productId) {
      try {
        const product = await api.adminProducts.get(job.productId);
        productCategory = product.category;
      } catch {
        // best-effort; categories fall back to default for routing UI.
      }
    }
  } catch {
    notFound();
  }

  return (
    <section className="space-y-6">
      <Link
        href="/production-jobs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
        {t('productionJobs.actions.backToList')}
      </Link>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{job.jobNumber}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary">{t(`productionJobs.statusLabels.${job.status}`)}</Badge>
          <span className="font-mono text-xs">{job.orderNumber}</span>
          <span>·</span>
          <span>{job.printMethod}</span>
          <span>·</span>
          <span>{t('productionJobs.detail.quantityLabel', { count: job.quantity })}</span>
          {job.supplierName && (
            <>
              <span>·</span>
              <span>{job.supplierName}</span>
            </>
          )}
        </div>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('productionJobs.detail.summary')}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Field label={t('productionJobs.detail.orderItems')} value={job.orderItemIds.join(', ')} mono />
            <Field
              label={t('productionJobs.detail.expectedReadyAt')}
              value={job.expectedReadyAt ? new Date(job.expectedReadyAt).toLocaleString(locale) : '—'}
            />
            <Field
              label={t('productionJobs.detail.startedAt')}
              value={job.startedAt ? new Date(job.startedAt).toLocaleString(locale) : '—'}
            />
            <Field
              label={t('productionJobs.detail.completedAt')}
              value={job.completedAt ? new Date(job.completedAt).toLocaleString(locale) : '—'}
            />
            <Field
              label={t('productionJobs.detail.supplierCost')}
              value={
                job.supplierCost
                  ? `${(job.supplierCost.amountMinor / 100).toFixed(2)} ${job.supplierCost.currency}`
                  : '—'
              }
            />
            <Field
              label={t('productionJobs.detail.failureReason')}
              value={job.failureReason ?? '—'}
            />
          </dl>
        </CardContent>
      </Card>

      <JobActions
        job={job}
        suppliers={suppliers}
        apiBaseUrl={getApiBaseUrl()}
        destinationCountry={destinationCountry}
        productCategory={productCategory}
      />

      {job.qcAttachments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('productionJobs.detail.qcArchive')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {job.qcAttachments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{a.fileName}</span>
                    <span className="text-xs text-muted-foreground">{a.contentType}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.uploadedAt).toLocaleString(locale)}
                    </span>
                    {a.note && <span className="text-xs">{a.note}</span>}
                  </div>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {t('productionJobs.detail.openAttachment')}
                  </a>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {job.internalNotes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('productionJobs.detail.notes')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              {job.internalNotes.map((n) => (
                <li key={n.id} className="rounded border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    {n.authorName} · {new Date(n.createdAt).toLocaleString(locale)}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}): JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? 'font-mono text-xs' : 'text-sm'}>{value}</dd>
    </div>
  );
}
