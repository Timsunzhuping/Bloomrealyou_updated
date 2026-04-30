import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  PRODUCTION_JOB_STATUSES,
  type AdminProductionJobDto,
  type ProductionJobStatus,
} from '@custom-merch/shared';
import {
  Badge,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { Link } from '@/i18n/navigation';
import { getCurrentAdminUser } from '@/lib/admin-user';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function SupplierPortalListPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const user = await getCurrentAdminUser();
  if (!user || user.role !== 'supplier_user' || !user.supplierId) {
    redirect(`/${locale}/dashboard`);
  }

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const status = (PRODUCTION_JOB_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as ProductionJobStatus)
    : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminProductionJobDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.supplierPortal.list({ status, page, pageSize: 20 });
    rows = result.items;
    total = result.total;
    pageSize = result.pageSize;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('supplierPortal.heading')}
        </h1>
        <p className="text-muted-foreground">
          {t('supplierPortal.subtitle')}
        </p>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('productionJobs.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('productionJobs.filter.allStatuses')}</option>
            {PRODUCTION_JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`productionJobs.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-8 rounded border border-input bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          {t('productionJobs.filter.apply')}
        </button>
      </form>

      {fetchError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {fetchError}
        </p>
      )}

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t('supplierPortal.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('productionJobs.table.jobNumber')}</TableHead>
                <TableHead>{t('productionJobs.table.order')}</TableHead>
                <TableHead>{t('productionJobs.table.printMethod')}</TableHead>
                <TableHead className="text-end">
                  {t('productionJobs.table.quantity')}
                </TableHead>
                <TableHead>{t('productionJobs.table.status')}</TableHead>
                <TableHead>{t('productionJobs.table.updated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((j) => (
                <TableRow key={j.id}>
                  <TableCell className="font-medium">
                    <Link href={`/supplier-portal/${j.id}`}>{j.jobNumber}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{j.orderNumber}</TableCell>
                  <TableCell className="text-xs">{j.printMethod}</TableCell>
                  <TableCell className="text-end tabular-nums">{j.quantity}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {t(`productionJobs.statusLabels.${j.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(j.updatedAt).toLocaleString(locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PaginationBar
        page={page}
        pageSize={pageSize}
        total={total}
        params={{ status }}
      />
    </section>
  );
}
