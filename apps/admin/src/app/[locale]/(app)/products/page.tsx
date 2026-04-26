import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  type AdminProductDto,
  type ProductCategory,
  type ProductStatus,
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
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}

function localised(value: AdminProductDto['name'], locale: Locale): string {
  return value[locale] ?? value.en;
}

function fmtMoney(amountMinor: number, currency: string): string {
  return `${(amountMinor / 100).toFixed(2)} ${currency}`;
}

export default async function AdminProductsListPage({
  params,
  searchParams,
}: PageProps): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const sp = await searchParams;
  const t = await getTranslations('admin');

  const category = (PRODUCT_CATEGORIES as readonly string[]).includes(sp.category ?? '')
    ? (sp.category as ProductCategory)
    : undefined;
  const status = (PRODUCT_STATUSES as readonly string[]).includes(sp.status ?? '')
    ? (sp.status as ProductStatus)
    : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminProductDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminProducts.list({
      q: sp.q,
      category,
      status,
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
          <h1 className="text-3xl font-bold tracking-tight">{t('products.listHeading')}</h1>
          <p className="text-muted-foreground">{t('products.listSubtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="me-2 h-4 w-4" aria-hidden="true" />
            {t('products.actions.create')}
          </Link>
        </Button>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('products.filter.search')}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('products.filter.searchPlaceholder')}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('products.filter.category')}
          </span>
          <select
            name="category"
            defaultValue={category ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('products.filter.allCategories')}</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('products.filter.status')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('products.filter.allStatuses')}</option>
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`products.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t('products.filter.apply')}
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
            {t('products.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('products.table.name')}</TableHead>
                <TableHead>{t('products.table.slug')}</TableHead>
                <TableHead>{t('products.table.category')}</TableHead>
                <TableHead>{t('products.table.status')}</TableHead>
                <TableHead>{t('products.table.basePrice')}</TableHead>
                <TableHead>{t('products.table.variants')}</TableHead>
                <TableHead>{t('products.table.updated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/products/${p.id}`}>{localised(p.name, locale)}</Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.slug}</TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{t(`products.statusLabels.${p.status}`)}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {fmtMoney(p.basePrice.amountMinor, p.basePrice.currency)}
                  </TableCell>
                  <TableCell>{p.variants.length}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(p.updatedAt).toLocaleString(locale)}
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
        params={{ q: sp.q, category, status }}
      />
    </section>
  );
}
