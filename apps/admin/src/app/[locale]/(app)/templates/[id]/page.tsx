import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminTemplateDto } from '@custom-merch/shared';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { TemplateEditPane } from '@/components/templates/template-edit-pane';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export default async function TemplateDetailPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  let template: AdminTemplateDto;
  try {
    const api = await getAdminApi();
    template = await api.adminTemplates.get(id);
  } catch {
    notFound();
  }

  return <TemplateEditPane template={template} apiBaseUrl={getApiBaseUrl()} />;
}
