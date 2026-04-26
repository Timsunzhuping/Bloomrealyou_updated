import { redirect } from '@/i18n/navigation';

interface RootProps {
  params: Promise<{ locale: string }>;
}

/** Admin root simply redirects to /[locale]/dashboard. */
export default async function AdminRoot({ params }: RootProps): Promise<void> {
  const { locale } = await params;
  redirect({ href: '/dashboard', locale });
}
