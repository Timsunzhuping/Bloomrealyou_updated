import { isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { BrandLogo, Card, CardContent } from '@custom-merch/ui';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/language-switcher';
import { LoginForm } from '@/components/login/login-form';
import { getApiBaseUrl } from '@/lib/api';

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}

const DEMO_ACCOUNTS: Array<{ roleKey: string; email: string; password: string }> = [
  { roleKey: 'admin', email: 'admin@bloomrealyou.com', password: 'admin123' },
  { roleKey: 'sales', email: 'sales@bloomrealyou.com', password: 'sales123' },
  { roleKey: 'designer', email: 'designer@bloomrealyou.com', password: 'designer123' },
  { roleKey: 'production_manager', email: 'pm@bloomrealyou.com', password: 'pm123' },
  { roleKey: 'finance', email: 'finance@bloomrealyou.com', password: 'finance123' },
  { roleKey: 'supplier_user', email: 'supplier@bloomrealyou.com', password: 'supplier123' },
];

const SHOW_DEMO_ACCOUNTS =
  process.env.SHOW_DEMO_ACCOUNTS === 'true' || process.env.NODE_ENV !== 'production';

export default async function LoginPage({ params, searchParams }: Props): Promise<JSX.Element> {
  const { locale: rawLocale } = await params;
  const locale: Locale = isSupportedLocale(rawLocale) ? rawLocale : 'en';
  setRequestLocale(locale);

  const { next } = await searchParams;
  const t = await getTranslations('admin');
  const tApp = await getTranslations('common.app');
  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-background px-4 py-3">
        <BrandLogo label={`${tApp('name')} · ${t('title')}`} markSize={38} textClassName="text-sm sm:text-base" />
        <LanguageSwitcher />
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth.signInHeading')}</h1>
          <p className="max-w-md text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
          {SHOW_DEMO_ACCOUNTS && (
            <Card className="mt-6 bg-background/80">
              <CardContent className="space-y-3 p-5 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{t('auth.demoTitle')}</p>
                  <p className="text-muted-foreground">{t('auth.demoHint')}</p>
                </div>
                <ul className="space-y-1.5 font-mono text-[11px]">
                  {DEMO_ACCOUNTS.map((acc) => (
                    <li key={acc.email} className="flex justify-between gap-3">
                      <span className="text-muted-foreground">{t(`roleLabels.${acc.roleKey}`)}</span>
                      <span>
                        {acc.email} / {acc.password}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
        <LoginForm apiBaseUrl={apiBaseUrl} redirectTo={next} />
      </div>
    </div>
  );
}
