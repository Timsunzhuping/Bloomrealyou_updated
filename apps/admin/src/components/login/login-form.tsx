'use client';

import type { AdminLoginResponse } from '@custom-merch/shared';
import { Button, FormField, Input } from '@custom-merch/ui';
import { Lock, LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import {
  ADMIN_COOKIE_MAX_AGE_SECONDS,
  ADMIN_TOKEN_COOKIE,
  ADMIN_USER_COOKIE,
} from '@/lib/auth-cookies';

interface Props {
  apiBaseUrl: string;
  redirectTo?: string;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  const flags = ['Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSeconds}`];
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') flags.push('Secure');
  document.cookie = `${name}=${encodeURIComponent(value)}; ${flags.join('; ')}`;
}

export function LoginForm({ apiBaseUrl, redirectTo }: Props): JSX.Element {
  const t = useTranslations('admin.auth');
  const router = useRouter();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBaseUrl}/admin/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (res.status === 401) {
        setError(t('errorInvalidCredentials'));
        return;
      }
      if (!res.ok) {
        setError(t('errorGeneric'));
        return;
      }
      const data = (await res.json()) as AdminLoginResponse;
      setCookie(ADMIN_TOKEN_COOKIE, data.token, ADMIN_COOKIE_MAX_AGE_SECONDS);
      setCookie(ADMIN_USER_COOKIE, JSON.stringify(data.user), ADMIN_COOKIE_MAX_AGE_SECONDS);

      const safeRedirect = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/dashboard';
      // Use a hard redirect so the new cookies are visible to the middleware
      // and the server-side layout that reads them via `cookies()`.
      window.location.assign(safeRedirect);
    } catch {
      setError(t('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
      <header className="flex items-center gap-2 text-base font-semibold">
        <Lock className="h-4 w-4 text-primary" aria-hidden="true" />
        {t('signInHeading')}
      </header>
      <p className="text-xs text-muted-foreground">{t('signInSubtitle')}</p>

      <FormField id="email" label={t('emailLabel')} required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          required
        />
      </FormField>
      <FormField id="password" label={t('passwordLabel')} required>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </FormField>

      {error && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} className="w-full">
        <LogIn className="me-2 h-4 w-4" aria-hidden="true" />
        {submitting ? t('signingIn') : t('signInCta')}
      </Button>

      <button
        type="button"
        className="hidden"
        // Prevent the browser auto-fill heuristic from suppressing the submit
        // when only one field is touched in dev. Decorative.
        tabIndex={-1}
        onClick={() => router.refresh()}
      />
    </form>
  );
}
