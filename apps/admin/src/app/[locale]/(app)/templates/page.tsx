import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { PRODUCT_CATEGORIES, type AdminTemplateDto, type ProductCategory } from '@custom-merch/shared';
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
import { Plus, Star } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { PaginationBar } from '@/components/data-table/pagination-bar';
import { Link } from '@/i18n/navigation';
import { getAdminApi } from '@/lib/api';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; category?: string; isPublished?: string; page?: string }>;
}

export default async function AdminTemplatesListPage({
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
  const isPublished =
    sp.isPublished === 'true' ? true : sp.isPublished === 'false' ? false : undefined;
  const page = sp.page ? Math.max(1, Number(sp.page)) : 1;

  let rows: AdminTemplateDto[] = [];
  let total = 0;
  let pageSize = 20;
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminTemplates.list({ q: sp.q, category, isPublished, page, pageSize: 20 });
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
          <h1 className="text-3xl font-bold tracking-tight">{t('templates.listHeading')}</h1>
          <p className="text-muted-foreground">{t('templates.listSubtitle')}</p>
        </div>
        <Button asChild>
          <Link href="/templates/new">
            <Plus className="me-2 h-4 w-4" aria-hidden="true" />
            {t('templates.actions.create')}
          </Link>
        </Button>
      </header>

      <form className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3 text-sm">
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('templates.filter.search')}
          </span>
          <input
            type="search"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder={t('templates.filter.searchPlaceholder')}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('templates.filter.category')}
          </span>
          <select
            name="category"
            defaultValue={category ?? ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('templates.filter.allCategories')}</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('templates.filter.publish')}
          </span>
          <select
            name="isPublished"
            defaultValue={typeof isPublished === 'boolean' ? String(isPublished) : ''}
            className="h-8 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="">{t('templates.filter.all')}</option>
            <option value="true">{t('templates.statusLabels.published')}</option>
            <option value="false">{t('templates.statusLabels.unpublished')}</option>
          </select>
        </label>
        <Button type="submit" variant="outline" size="sm">
          {t('templates.filter.apply')}
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
            {t('templates.empty')}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('templates.table.preview')}</TableHead>
                <TableHead>{t('templates.table.name')}</TableHead>
                <TableHead>{t('templates.table.categories')}</TableHead>
                <TableHead>{t('templates.table.status')}</TableHead>
                <TableHead>{t('templates.table.featured')}</TableHead>
                <TableHead>{t('templates.table.updated')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((tpl) => (
                <TableRow key={tpl.id}>
                  <TableCell>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={tpl.previewImageUrl}
                      alt=""
                      className="h-10 w-14 rounded border object-cover"
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/templates/${tpl.id}`}>{tpl.name[locale] ?? tpl.name.en}</Link>
                  </TableCell>
                  <TableCell className="text-xs">{tpl.supportedCategories.join(', ')}</TableCell>
                  <TableCell>
                    <Badge variant={tpl.isPublished ? 'default' : 'secondary'}>
                      {tpl.isPublished
                        ? t('templates.statusLabels.published')
                        : t('templates.statusLabels.unpublished')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tpl.isFeatured && (
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(tpl.updatedAt).toLocaleString(locale)}
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
        params={{
          q: sp.q,
          category,
          isPublished: typeof isPublished === 'boolean' ? String(isPublished) : undefined,
        }}
      />
    </section>
  );
}
