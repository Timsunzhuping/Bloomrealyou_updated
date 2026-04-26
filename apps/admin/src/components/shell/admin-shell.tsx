import type { AdminUserDto } from '@custom-merch/shared';
import { getTranslations } from 'next-intl/server';

import { getApiBaseUrl } from '@/lib/api';

import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

interface Props {
  user: AdminUserDto;
  children: React.ReactNode;
}

export async function AdminShell({ user, children }: Props): Promise<JSX.Element> {
  const t = await getTranslations('admin.shell');
  const apiBaseUrl = getApiBaseUrl();

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:rounded focus:bg-primary focus:px-3 focus:py-1 focus:text-primary-foreground"
      >
        {t('skipToContent')}
      </a>
      <Topbar user={user} apiBaseUrl={apiBaseUrl} />
      <div className="flex">
        <Sidebar user={user} />
        <main id="admin-main" className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
