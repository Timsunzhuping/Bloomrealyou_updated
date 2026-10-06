import { hasAdminPermission } from '@custom-merch/shared';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { ModelConfigurationWorkspace } from '@/components/settings/model-configuration-workspace';
import { getCurrentAdminUser } from '@/lib/admin-user';
import { getApiBaseUrl } from '@/lib/api';

export default async function ModelConfigurationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await getCurrentAdminUser();
  if (!user || !hasAdminPermission(user.permissions, 'settings.read'))
    redirect(`/${locale}/forbidden`);
  return (
    <ModelConfigurationWorkspace
      apiBaseUrl={getApiBaseUrl()}
      canWrite={hasAdminPermission(user.permissions, 'settings.write')}
    />
  );
}
