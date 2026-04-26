'use client';

import { SUPPORTED_LOCALES, type Locale } from '@custom-merch/i18n';
import type { AccountProfileDto } from '@custom-merch/shared';
import {
  Button,
  ErrorState,
  FormField,
  Input,
  Label,
  LoadingState,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { getClientApi } from '@/lib/client-api';

export function AccountProfileForm(): JSX.Element {
  const t = useTranslations('account.profile');
  const tLocales = useTranslations('common.languageSwitcher');
  const tCommon = useTranslations('common');
  const [profile, setProfile] = React.useState<AccountProfileDto | null>(null);
  const [error, setError] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const dto = await getClientApi().account.getProfile();
        if (!cancelled) setProfile(dto);
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState title={t('heading')} />;
  if (!profile) return <LoadingState label={tCommon('states.loading')} />;

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const next = await getClientApi().account.updateProfile({
        email: profile.email ?? undefined,
        fullName: profile.fullName ?? undefined,
        phone: profile.phone ?? undefined,
        locale: profile.locale,
        marketingOptIn: profile.marketingOptIn,
      });
      setProfile(next);
      setToast(t('saved'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">{t('heading')}</h2>
      {toast && (
        <div className="rounded-md bg-foreground px-4 py-2 text-center text-xs text-background">{toast}</div>
      )}
      <FormField id="profile-name" label={t('fullName')}>
        <Input
          value={profile.fullName ?? ''}
          onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
        />
      </FormField>
      <FormField id="profile-email" label={t('email')}>
        <Input
          type="email"
          value={profile.email ?? ''}
          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
        />
      </FormField>
      <FormField id="profile-phone" label={t('phone')}>
        <Input
          value={profile.phone ?? ''}
          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
        />
      </FormField>
      <div className="space-y-1.5">
        <Label htmlFor="profile-locale">{t('language')}</Label>
        <select
          id="profile-locale"
          value={profile.locale}
          onChange={(e) => setProfile({ ...profile, locale: e.target.value as Locale })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {SUPPORTED_LOCALES.map((code) => (
            <option key={code} value={code}>
              {tLocales(code)}
            </option>
          ))}
        </select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={profile.marketingOptIn}
          onChange={(e) => setProfile({ ...profile, marketingOptIn: e.target.checked })}
        />
        <span>{t('marketingOptIn')}</span>
      </label>
      <Button type="submit" disabled={submitting}>
        {submitting ? t('saving') : t('save')}
      </Button>
    </form>
  );
}
