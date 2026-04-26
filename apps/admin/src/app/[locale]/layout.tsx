import { getLayoutDirection, isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

import './globals.css';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams(): Array<{ locale: Locale }> {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(props: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'admin' });
  const tApp = await getTranslations({ locale, namespace: 'common.app' });
  return {
    title: { default: t('title'), template: `%s · ${tApp('name')}` },
    description: tApp('tagline'),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((code) => [code, `/${code}/dashboard`]),
      ),
    },
  };
}

export default async function AdminLocaleLayout(props: LocaleLayoutProps): Promise<JSX.Element> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'admin' });
  const tApp = await getTranslations({ locale, namespace: 'common.app' });
  const dir = getLayoutDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="border-b bg-muted/30">
            <div className="container flex h-14 items-center justify-between gap-6">
              <Link href="/dashboard" className="font-semibold">
                {tApp('name')} · {t('title')}
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/dashboard">{t('nav.dashboard')}</Link>
                <Link href="/products">{t('nav.products')}</Link>
                <Link href="/orders">{t('nav.orders')}</Link>
                <LanguageSwitcher />
              </nav>
            </div>
          </header>
          <main className="container py-10">{props.children}</main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
