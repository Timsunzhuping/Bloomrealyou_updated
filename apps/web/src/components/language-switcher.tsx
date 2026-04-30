'use client';

import { SUPPORTED_LOCALES, type Locale } from '@custom-merch/i18n';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { usePathname, useRouter } from '@/i18n/navigation';

/**
 * Drop-down language switcher. On change, replaces the current pathname with
 * the same path under the new locale prefix, preserving query / hash via
 * next-intl's `useRouter`.
 */
export function LanguageSwitcher(): JSX.Element {
  const t = useTranslations('common.languageSwitcher');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function onChange(event: React.ChangeEvent<HTMLSelectElement>): void {
    const next = event.target.value as Locale;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{t('label')}</span>
      <select
        aria-label={t('label')}
        value={locale}
        disabled={isPending}
        onChange={onChange}
        className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {SUPPORTED_LOCALES.map((code) => (
          <option key={code} value={code}>
            {t(code)}
          </option>
        ))}
      </select>
    </label>
  );
}
