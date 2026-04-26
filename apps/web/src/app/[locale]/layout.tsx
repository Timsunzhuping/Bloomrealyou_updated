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

/** Pre-render every supported locale at build time. */
export function generateStaticParams(): Array<{ locale: Locale }> {
  return routing.locales.map((locale) => ({ locale }));
}

/** Locale-aware <title> / <meta>. */
export async function generateMetadata(props: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) return {};
  const t = await getTranslations({ locale, namespace: 'common.app' });
  return {
    title: { default: t('name'), template: `%s · ${t('name')}` },
    description: t('tagline'),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((code) => [code, `/${code}`])),
    },
  };
}

export default async function LocaleLayout(props: LocaleLayoutProps): Promise<JSX.Element> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const t = await getTranslations({ locale, namespace: 'common' });
  const dir = getLayoutDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <header className="border-b">
            <div className="container flex h-14 items-center justify-between gap-6">
              <Link href="/" className="font-semibold">
                {t('app.name')}
              </Link>
              <nav className="flex items-center gap-4 text-sm">
                <Link href="/">{t('nav.home')}</Link>
                <Link href="/products">{t('nav.products')}</Link>
                <Link href="/business">{t('nav.business')}</Link>
                <Link href="/account">{t('nav.account')}</Link>
                <Link href="/cart">{t('nav.cart')}</Link>
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
