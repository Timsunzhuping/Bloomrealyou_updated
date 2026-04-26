import { setRequestLocale } from 'next-intl/server';

import { AccountOverview } from '@/components/account/overview';

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function AccountOverviewPage({ params }: Props): Promise<JSX.Element> {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AccountOverview />;
}
