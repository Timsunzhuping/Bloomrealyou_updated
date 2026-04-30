'use client';

import type { AdminUserDto } from '@custom-merch/shared';
import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { SidebarContent } from './sidebar';

interface Props {
  user: AdminUserDto;
}

/**
 * Hamburger trigger + slide-in drawer for sub-`lg` viewports. The drawer reuses
 * the SidebarContent so the visible link list never drifts from the desktop
 * shell. Body scroll is locked while the drawer is open so iOS Safari doesn't
 * scroll the underlying page when users swipe within the menu.
 */
export function MobileSidebar({ user }: Props): JSX.Element {
  const t = useTranslations('admin.shell');
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={t('openMenu')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border bg-background text-foreground hover:bg-muted lg:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 start-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <header className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">{t('openMenu')}</span>
              <button
                type="button"
                aria-label={t('closeMenu')}
                onClick={() => setOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>
            <nav
              aria-label="Admin navigation"
              className="flex-1 overflow-y-auto p-3"
            >
              <SidebarContent user={user} onNavigate={() => setOpen(false)} />
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
