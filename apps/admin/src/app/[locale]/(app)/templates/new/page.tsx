import { setRequestLocale } from 'next-intl/server';

import { TemplateCreatePane } from '@/components/templates/template-create-pane';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function TemplateCreatePage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <TemplateCreatePane />;
}
