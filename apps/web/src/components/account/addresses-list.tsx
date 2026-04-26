'use client';

import type { SaveAddressInput, SavedAddressDto } from '@custom-merch/shared';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  FormField,
  Input,
  LoadingState,
} from '@custom-merch/ui';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { getClientApi } from '@/lib/client-api';

const EMPTY_FORM: SaveAddressInput = {
  fullName: '',
  line1: '',
  city: '',
  postalCode: '',
  country: 'US',
};

export function AccountAddressesList(): JSX.Element {
  const t = useTranslations('account.addresses');
  const tCommon = useTranslations('common');
  const [list, setList] = React.useState<SavedAddressDto[] | null>(null);
  const [error, setError] = React.useState(false);
  const [editing, setEditing] = React.useState<{ id: string | null; form: SaveAddressInput } | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const next = await getClientApi().account.listAddresses();
      setList(next);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      if (editing.id) {
        await getClientApi().account.updateAddress(editing.id, editing.form);
      } else {
        await getClientApi().account.saveAddress(editing.form);
      }
      setEditing(null);
      setToast(t('savedToast'));
      await refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id: string): Promise<void> => {
    await getClientApi().account.removeAddress(id);
    await refresh();
  };

  if (error) return <ErrorState title={t('empty')} />;
  if (!list) return <LoadingState label={tCommon('states.loading')} />;

  return (
    <section className="space-y-4">
      {toast && (
        <div className="rounded-md bg-foreground px-4 py-2 text-center text-xs text-background">{toast}</div>
      )}

      {list.length === 0 ? (
        <EmptyState
          title={t('empty')}
          action={
            <Button onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM } })}>
              <Plus className="me-2 h-4 w-4" />
              {t('addNew')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setEditing({ id: null, form: { ...EMPTY_FORM } })}>
              <Plus className="me-2 h-4 w-4" />
              {t('addNew')}
            </Button>
          </div>
          <ul className="grid gap-4 md:grid-cols-2">
            {list.map((address) => (
              <li key={address.id} className="space-y-2 rounded-lg border bg-card p-4 text-sm">
                <header className="flex items-start justify-between gap-2">
                  <p className="font-semibold">{address.label ?? address.fullName}</p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="rounded p-1 text-muted-foreground hover:bg-accent"
                      aria-label={t('edit')}
                      onClick={() =>
                        setEditing({
                          id: address.id,
                          form: {
                            label: address.label,
                            fullName: address.fullName,
                            company: address.company,
                            line1: address.line1,
                            line2: address.line2,
                            city: address.city,
                            state: address.state,
                            postalCode: address.postalCode,
                            country: address.country,
                            phone: address.phone,
                            isDefaultShipping: address.isDefaultShipping,
                            isDefaultBilling: address.isDefaultBilling,
                          },
                        })
                      }
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1 text-destructive hover:bg-destructive/10"
                      aria-label={t('delete')}
                      onClick={() => void onDelete(address.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </header>
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>
                  {address.city}
                  {address.state ? `, ${address.state}` : ''} {address.postalCode}
                </p>
                <p>{address.country}</p>
                <div className="flex gap-2 pt-1">
                  {address.isDefaultShipping && <Badge variant="secondary">{t('defaultShipping')}</Badge>}
                  {address.isDefaultBilling && <Badge variant="secondary">{t('defaultBilling')}</Badge>}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing && (
        <form
          onSubmit={onSubmit}
          className="space-y-3 rounded-lg border bg-card p-5"
        >
          <h3 className="text-base font-semibold">{editing.id ? t('edit') : t('addNew')}</h3>
          <FormField id="addr-label" label={t('form.label')}>
            <Input
              value={editing.form.label ?? ''}
              onChange={(e) =>
                setEditing({ ...editing, form: { ...editing.form, label: e.target.value } })
              }
            />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="addr-name" label={t('form.fullName')} required>
              <Input
                value={editing.form.fullName}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, fullName: e.target.value } })
                }
                required
              />
            </FormField>
            <FormField id="addr-company" label={t('form.company')}>
              <Input
                value={editing.form.company ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, company: e.target.value } })
                }
              />
            </FormField>
            <FormField id="addr-line1" label={t('form.addressLine1')} required className="sm:col-span-2">
              <Input
                value={editing.form.line1}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, line1: e.target.value } })
                }
                required
              />
            </FormField>
            <FormField id="addr-line2" label={t('form.addressLine2')} className="sm:col-span-2">
              <Input
                value={editing.form.line2 ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, line2: e.target.value } })
                }
              />
            </FormField>
            <FormField id="addr-city" label={t('form.city')} required>
              <Input
                value={editing.form.city}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, city: e.target.value } })
                }
                required
              />
            </FormField>
            <FormField id="addr-state" label={t('form.state')}>
              <Input
                value={editing.form.state ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, state: e.target.value } })
                }
              />
            </FormField>
            <FormField id="addr-postal" label={t('form.postalCode')} required>
              <Input
                value={editing.form.postalCode}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, postalCode: e.target.value } })
                }
                required
              />
            </FormField>
            <FormField id="addr-country" label={t('form.country')} required>
              <Input
                value={editing.form.country}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    form: {
                      ...editing.form,
                      country: e.target.value.toUpperCase().slice(0, 2),
                    },
                  })
                }
                maxLength={2}
                required
              />
            </FormField>
            <FormField id="addr-phone" label={t('form.phone')} className="sm:col-span-2">
              <Input
                value={editing.form.phone ?? ''}
                onChange={(e) =>
                  setEditing({ ...editing, form: { ...editing.form, phone: e.target.value } })
                }
              />
            </FormField>
          </div>
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.form.isDefaultShipping}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    form: { ...editing.form, isDefaultShipping: e.target.checked },
                  })
                }
              />
              <span>{t('form.isDefaultShipping')}</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!editing.form.isDefaultBilling}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    form: { ...editing.form, isDefaultBilling: e.target.checked },
                  })
                }
              />
              <span>{t('form.isDefaultBilling')}</span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? t('form.saving') : t('form.save')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              {t('form.cancel')}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
