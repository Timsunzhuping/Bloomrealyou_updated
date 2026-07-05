import { getLayoutDirection, isSupportedLocale, type Locale } from '@custom-merch/i18n';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';

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
    icons: { icon: '/logo.png', apple: '/logo.png' },
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((code) => [code, `/${code}/dashboard`]),
      ),
    },
  };
}

/**
 * Root locale layout. Intentionally minimal — the chrome (sidebar, topbar,
 * breadcrumb, user menu) lives in `(app)/layout.tsx` so the `/login` page
 * can render without it.
 */
export default async function AdminLocaleLayout(props: LocaleLayoutProps): Promise<JSX.Element> {
  const { locale } = await props.params;
  if (!isSupportedLocale(locale)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = getLayoutDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {props.children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
