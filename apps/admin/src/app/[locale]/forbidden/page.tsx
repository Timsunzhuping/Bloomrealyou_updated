import { isSupportedLocale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * 403 page rendered when the admin shell detects that the active session has
 * an admin token but the requested page requires a permission the user
 * doesn't hold (see middleware + per-page guards).
 */
export default async function ForbiddenPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  const t = await getTranslations('errors.forbidden');

  return (
    <section className="space-y-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mx-auto max-w-prose text-muted-foreground">{t('body')}</p>
      <Link href="/dashboard" className="text-primary underline">
        {t('backDashboard')}
      </Link>
    </section>
  );
}
