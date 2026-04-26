import { setRequestLocale } from 'next-intl/server';

import { DesignSystemShowcase } from './showcase';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function DesignSystemPage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DesignSystemShowcase />;
}
