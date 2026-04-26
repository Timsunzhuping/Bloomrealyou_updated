import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  PRODUCT_CATEGORIES,
  SUPPLIER_STATUSES,
  type AdminSupplierDto,
  type ProductCategory,
  type SupplierStatus,
} from '@custom-merch/shared';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@custom-merch/ui';
import { Plus } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    country?: string;
    status?: string;
    category?: string;
    page?: string;
  }>;
}

export default async function AdminSuppliersListPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const status = (SUPPLIER_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as SupplierStatus)
    : undefined;
  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(sp.category ?? '')
    ? (sp.category as ProductCategory)
    : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminSupplierDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminSuppliers.list({
      q: sp.q,
      country: sp.country,
      status,
      category,
      page,
      pageSize: 20,
    });
    rows = result.items;
    total = result.total;
    pageSize = result.pageSize;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">{t('suppliers.listHeading')}</h1>
          <p className="text-muted-foreground">{t('suppliers.listSubtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="me-2 h-4 w-4" aria-hidden="true" />
            {t('suppliers.actions.create')}
          </Link>
        </Button>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('suppliers.filter.search')}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('suppliers.filter.searchPlaceholder')}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('suppliers.filter.country')}
          </span>
          <input
            name="country"
            defaultValue={sp.country ?? ''}
            placeholder="US"
            maxLength={2}
            className="h-8 w-20 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('suppliers.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('suppliers.filter.allStatuses')}</option>
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`suppliers.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('suppliers.filter.category')}
          </span>
          <select
            name="category"
            defaultValue={category ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('suppliers.filter.allCategories')}</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t('suppliers.filter.apply')}
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
            {t('suppliers.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('suppliers.table.name')}</TableHead>
                <TableHead>{t('suppliers.table.country')}</TableHead>
                <TableHead>{t('suppliers.table.contact')}</TableHead>
                <TableHead>{t('suppliers.table.categories')}</TableHead>
                <TableHead>{t('suppliers.table.print')}</TableHead>
                <TableHead className="text-end">{t('suppliers.table.moq')}</TableHead>
                <TableHead className="text-end">{t('suppliers.table.leadDays')}</TableHead>
                <TableHead className="text-end">{t('suppliers.table.qualityScore')}</TableHead>
                <TableHead>{t('suppliers.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/suppliers/${s.id}`}>{s.name}</Link>
                  </TableCell>
                  <TableCell>
                    {s.country}
                    {s.region ? ` · ${s.region}` : ''}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.contactEmail}</TableCell>
                  <TableCell className="text-xs">{s.supportedCategories.join(', ')}</TableCell>
                  <TableCell className="text-xs">{s.supportedPrintMethods.join(', ')}</TableCell>
                  <TableCell className="text-end tabular-nums">{s.minOrderQuantity}</TableCell>
                  <TableCell className="text-end tabular-nums">{s.averageProductionDays}d</TableCell>
                  <TableCell className="text-end tabular-nums">{s.qualityScore}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`suppliers.statusLabels.${s.status}`)}</Badge>
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
        params={{ q: sp.q, country: sp.country, status, category }}
      />
    </section>
  );
}
