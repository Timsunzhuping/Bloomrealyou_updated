import { Card, CardContent, CardHeader, CardTitle } from '@custom-merch/ui';
import { Construction } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

interface Props {
  /** i18n key under `admin.stubs.<sectionKey>`. */
  sectionKey: string;
}

/**
 * Generic placeholder used by the eight back-office sections that ship as
 * stubs in WP-13. The shared component keeps the visual treatment consistent
 * and lets the framework/scaffold story stay legible to QA.
 */
export async function StubPage({ sectionKey }: Props): Promise<JSX.Element> {
  const t = await getTranslations('admin');

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-accent">
          {t('shell.comingSoon')}
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          {t(`stubs.${sectionKey}.heading`)}
        </h1>
        <p className="max-w-2xl text-muted-foreground">{t(`stubs.${sectionKey}.body`)}</p>
      </header>
      <Card className="max-w-2xl">
        <CardHeader className="flex-row items-center gap-3 space-y-0">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-accent/10 text-accent">
            <Construction className="h-5 w-5" aria-hidden="true" />
          </span>
          <CardTitle className="text-base">{t('shell.comingSoon')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('shell.stub')}
        </CardContent>
      </Card>
    </section>
  );
}
