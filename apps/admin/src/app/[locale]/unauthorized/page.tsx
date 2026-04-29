import { isSupportedLocale } from '@custom-merch/i18n';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

interface Props {
  params: Promise<{ locale: string }>;
}

/**
 * 401 page rendered when the admin shell rejects an unauthenticated request
 * before it ever hits the protected layout. Prompts a fresh login.
 */
export default async function UnauthorizedPage({ params }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);
  const t = await getTranslations('errors.unauthorizedPage');

  return (
    <section className="space-y-4 py-16 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="mx-auto max-w-prose text-muted-foreground">{t('body')}</p>
      <Link href="/login" className="text-primary underline">
        {t('signIn')}
      </Link>
    </section>
  );
}
