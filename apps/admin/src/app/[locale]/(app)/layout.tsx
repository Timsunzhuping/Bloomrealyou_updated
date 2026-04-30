import { isSupportedLocale } from '@custom-merch/i18n';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

import { AdminShell } from '@/components/shell/admin-shell';
import { getCurrentAdminUser } from '@/lib/admin-user';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

/**
 * Authenticated layout. Renders the admin chrome (topbar + sidebar) around
 * every back-office page. Defends in depth against the middleware: if the
 * cookie is somehow present but unparseable, send the user back to /login.
 */
export default async function AppLayout({ children, params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) redirect('/');
  setRequestLocale(locale);

  const user = await getCurrentAdminUser();
  if (!user) redirect(`/${locale}/login`);

  return <AdminShell user={user}>{children}</AdminShell>;
}
