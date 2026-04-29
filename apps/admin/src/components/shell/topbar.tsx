import type { AdminUserDto } from '@custom-merch/shared';
import { getTranslations } from 'next-intl/server';

import { LanguageSwitcher } from '@/components/language-switcher';
import { Link } from '@/i18n/navigation';

import { Breadcrumb } from './breadcrumb';
import { MobileSidebar } from './mobile-sidebar';
import { UserMenu } from './user-menu';

interface Props {
  user: AdminUserDto;
  apiBaseUrl: string;
}

export async function Topbar({ user, apiBaseUrl }: Props): Promise<JSX.Element> {
  const t = await getTranslations('admin');
  const tApp = await getTranslations('common.app');

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4">
        <MobileSidebar user={user} />
        <Link href="/dashboard" className="font-semibold">
          {tApp('name')} · {t('title')}
        </Link>
        <div className="hidden flex-1 md:block">
          <Breadcrumb />
        </div>
        <div className="ms-auto flex items-center gap-2">
          <LanguageSwitcher />
          <UserMenu user={user} apiBaseUrl={apiBaseUrl} />
        </div>
      </div>
    </header>
  );
}
