import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import type { AdminNotificationTemplate } from '@custom-merch/sdk';
import { Card, CardContent, CardHeader, CardTitle } from '@custom-merch/ui';
import { Mail } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { TestSendPane } from '@/components/settings/test-send-pane';
import { getAdminApi, getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function SettingsPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const t = await getTranslations('admin');
  let templates: AdminNotificationTemplate[] = [];
  let fetchError: string | null = null;
  try {
    const api = await getAdminApi();
    const result = await api.adminNotifications.listTemplates();
    templates = result.items;
  } catch (e) {
    fetchError = (e as Error).message;
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {t('settings.heading')}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {t('settings.notifications.heading')}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          {t('settings.notifications.subtitle')}
        </p>
      </header>

      <Card>
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
            <Mail className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardTitle className="text-base">
            {t('settings.notifications.testSendHeading')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {fetchError && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {fetchError}
            </p>
          )}
          <TestSendPane templates={templates} apiBaseUrl={getApiBaseUrl()} />
        </CardContent>
      </Card>
    </section>
  );
}
