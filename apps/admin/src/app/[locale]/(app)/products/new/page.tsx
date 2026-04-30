import { setRequestLocale } from 'next-intl/server';

import { ProductCreatePane } from '@/components/products/product-create-pane';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function ProductCreatePage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProductCreatePane />;
}
