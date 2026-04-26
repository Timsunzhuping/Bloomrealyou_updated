import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminSupplierDto, AdminSupplierProductMappingDto } from '@custom-merch/shared';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { SupplierEditPane } from '@/components/suppliers/supplier-edit-pane';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function SupplierDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  let supplier: AdminSupplierDto;
  let mappings: AdminSupplierProductMappingDto[] = [];
  try {
    const api = await getAdminApi();
    supplier = await api.adminSuppliers.get(id);
    const result = await api.adminSuppliers.listMappings({ supplierId: id, pageSize: 100 });
    mappings = result.items;
  } catch {
    notFound();
  }

  return (
    <SupplierEditPane supplier={supplier} mappings={mappings} apiBaseUrl={getApiBaseUrl()} />
  );
}
