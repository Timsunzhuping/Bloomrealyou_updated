import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';

export default function LocaleNotFound(): JSX.Element {
  const t = useTranslations('errors.notFound');
  return (
    <section className="space-y-4 py-10 text-center">
      <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      <p className="text-muted-foreground">{t('body')}</p>
      <Link href="/dashboard" className="text-primary underline">
        {t('backHome')}
      </Link>
    </section>
  );
}
