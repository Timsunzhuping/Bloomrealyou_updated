'use client';

import type { AdminUserDto } from '@custom-merch/shared';
import { Button } from '@custom-merch/ui';
import { ChevronDown, LogOut, UserCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { ADMIN_TOKEN_COOKIE, ADMIN_USER_COOKIE } from '@/lib/auth-cookies';

interface Props {
  user: AdminUserDto;
  apiBaseUrl: string;
}

function clearAuthCookies(): void {
  // The HttpOnly flag is off so JS can clear the cookies on logout.
  document.cookie = `${ADMIN_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${ADMIN_USER_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function UserMenu({ user, apiBaseUrl }: Props): JSX.Element {
  const t = useTranslations('admin');
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const onLogout = async (): Promise<void> => {
    setBusy(true);
    try {
      // Best-effort revoke on the API. The cookie clear below logs the user
      // out locally even when the network call fails.
      const token = readCookie(ADMIN_TOKEN_COOKIE);
      if (token) {
        await fetch(`${apiBaseUrl}/admin/auth/logout`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}` },
        }).catch(() => null);
      }
    } finally {
      clearAuthCookies();
      setBusy(false);
      router.replace('/login');
      router.refresh();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-sm hover:bg-muted"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <UserCircle2 className="h-5 w-5" aria-hidden="true" />
        <span className="hidden sm:inline">{user.fullName}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 w-64 overflow-hidden rounded-md border bg-popover text-sm shadow-md"
        >
          <div className="border-b p-3 text-xs">
            <p className="text-muted-foreground">{t('userMenu.signedInAs')}</p>
            <p className="mt-0.5 font-medium text-foreground">{user.fullName}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{user.email}</p>
            <p className="mt-1 text-muted-foreground">
              <span className="font-medium">{t('userMenu.role')}:</span>{' '}
              {t(`roleLabels.${user.role}`)}
            </p>
          </div>
          <div className="p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              disabled={busy}
              onClick={onLogout}
            >
              <LogOut className="me-2 h-4 w-4" aria-hidden="true" />
              {busy ? t('userMenu.loggingOut') : t('userMenu.logout')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
