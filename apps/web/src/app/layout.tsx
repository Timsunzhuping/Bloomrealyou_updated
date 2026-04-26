import { getCommonMessages, DEFAULT_LOCALE } from '@custom-merch/i18n';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'Custom Merch Platform',
  description: 'AI-powered custom products and corporate merchandise',
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  const messages = getCommonMessages(DEFAULT_LOCALE);
  return (
    <html lang={DEFAULT_LOCALE}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <header className="border-b">
          <div className="container flex h-14 items-center font-semibold">{messages.app.name}</div>
        </header>
        <main className="container py-10">{children}</main>
      </body>
    </html>
  );
}
