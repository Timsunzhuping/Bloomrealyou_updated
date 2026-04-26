import { setRequestLocale } from 'next-intl/server';

import { StubPage } from '@/components/shell/stub-page';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SuppliersPage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StubPage sectionKey="suppliers" />;
}
