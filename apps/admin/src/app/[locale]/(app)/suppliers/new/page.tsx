import { setRequestLocale } from 'next-intl/server';

import { SupplierCreatePane } from '@/components/suppliers/supplier-create-pane';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SupplierCreatePage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupplierCreatePane />;
}
