'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  SUPPLIER_STATUSES,
  type AdminSupplierDto,
  type CreateAdminSupplierInput,
  type PrintMethod,
  type ProductCategory,
  type SupplierStatus,
  type UpdateAdminSupplierInput,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(1).max(200),
  country: z.string().length(2),
  region: z.string().max(120).optional().or(z.literal('')),
  contactName: z.string().min(1).max(200),
  contactEmail: z.string().email().max(320),
  contactPhone: z.string().max(40).optional().or(z.literal('')),
  supportedCategories: z.array(z.enum(PRODUCT_CATEGORIES)).min(1),
  supportedPrintMethods: z.array(z.enum(PRINT_METHODS)).min(1),
  minOrderQuantity: z.coerce.number().int().min(1),
  averageProductionDays: z.coerce.number().int().min(1).max(60),
  qualityScore: z.coerce.number().min(0).max(100),
  onTimeRate: z.coerce.number().min(0).max(1),
  returnRate: z.coerce.number().min(0).max(1),
  supportsWhiteLabel: z.boolean(),
  supportsSample: z.boolean(),
  status: z.enum(SUPPLIER_STATUSES),
  notes: z.string().max(2000).optional().or(z.literal('')),
});

export type SupplierFormValues = z.infer<typeof formSchema>;

interface Props {
  initial?: AdminSupplierDto;
  onSubmit: (
    payload: CreateAdminSupplierInput | UpdateAdminSupplierInput,
  ) => Promise<void>;
  submitting?: boolean;
  errorMessage?: string | null;
}

export function SupplierForm({ initial, onSubmit, submitting, errorMessage }: Props): JSX.Element {
  const t = useTranslations('admin');

  const defaults: SupplierFormValues = {
    name: initial?.name ?? '',
    country: initial?.country ?? 'US',
    region: initial?.region ?? '',
    contactName: initial?.contactName ?? '',
    contactEmail: initial?.contactEmail ?? '',
    contactPhone: initial?.contactPhone ?? '',
    supportedCategories: (initial?.supportedCategories as ProductCategory[]) ?? ['t-shirts'],
    supportedPrintMethods: (initial?.supportedPrintMethods as PrintMethod[]) ?? ['dtg'],
    minOrderQuantity: initial?.minOrderQuantity ?? 50,
    averageProductionDays: initial?.averageProductionDays ?? 5,
    qualityScore: initial?.qualityScore ?? 80,
    onTimeRate: initial?.onTimeRate ?? 0.9,
    returnRate: initial?.returnRate ?? 0.02,
    supportsWhiteLabel: initial?.supportsWhiteLabel ?? false,
    supportsSample: initial?.supportsSample ?? false,
    status: (initial?.status as SupplierStatus) ?? 'onboarding',
    notes: initial?.notes ?? '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const supportedCategories = watch('supportedCategories');
  const supportedPrintMethods = watch('supportedPrintMethods');

  const toggleCategory = (cat: ProductCategory): void => {
    const curr = supportedCategories ?? [];
    setValue(
      'supportedCategories',
      curr.includes(cat) ? curr.filter((c) => c !== cat) : [...curr, cat],
      { shouldValidate: true },
    );
  };
  const togglePrint = (method: PrintMethod): void => {
    const curr = supportedPrintMethods ?? [];
    setValue(
      'supportedPrintMethods',
      curr.includes(method) ? curr.filter((m) => m !== method) : [...curr, method],
      { shouldValidate: true },
    );
  };

  const submit = handleSubmit(async (values) => {
    const payload: CreateAdminSupplierInput | UpdateAdminSupplierInput = {
      name: values.name,
      country: values.country.toUpperCase(),
      region: values.region || undefined,
      contactName: values.contactName,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone || undefined,
      supportedCategories: values.supportedCategories,
      supportedPrintMethods: values.supportedPrintMethods,
      minOrderQuantity: values.minOrderQuantity,
      averageProductionDays: values.averageProductionDays,
      qualityScore: values.qualityScore,
      onTimeRate: values.onTimeRate,
      returnRate: values.returnRate,
      supportsWhiteLabel: values.supportsWhiteLabel,
      supportsSample: values.supportsSample,
      status: values.status,
      notes: values.notes || undefined,
    };
    await onSubmit(payload);
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('suppliers.form.name')} *`} error={errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label={`${t('suppliers.form.country')} *`} error={errors.country?.message}>
          <Input {...register('country')} maxLength={2} placeholder="US" />
        </Field>
        <Field label={t('suppliers.form.region')}>
          <Input {...register('region')} />
        </Field>
        <Field label={`${t('suppliers.form.contactName')} *`} error={errors.contactName?.message}>
          <Input {...register('contactName')} />
        </Field>
        <Field label={`${t('suppliers.form.contactEmail')} *`} error={errors.contactEmail?.message}>
          <Input type="email" {...register('contactEmail')} />
        </Field>
        <Field label={t('suppliers.form.contactPhone')}>
          <Input {...register('contactPhone')} />
        </Field>
        <Field
          label={`${t('suppliers.form.minOrderQuantity')} *`}
          error={errors.minOrderQuantity?.message}
        >
          <Input type="number" min={1} {...register('minOrderQuantity')} />
        </Field>
        <Field
          label={`${t('suppliers.form.averageProductionDays')} *`}
          error={errors.averageProductionDays?.message}
        >
          <Input type="number" min={1} max={60} {...register('averageProductionDays')} />
        </Field>
        <Field label={t('suppliers.form.qualityScore')}>
          <Input type="number" min={0} max={100} step={1} {...register('qualityScore')} />
        </Field>
        <Field label={t('suppliers.form.onTimeRate')} hint={t('suppliers.form.rateHint')}>
          <Input type="number" min={0} max={1} step={0.01} {...register('onTimeRate')} />
        </Field>
        <Field label={t('suppliers.form.returnRate')} hint={t('suppliers.form.rateHint')}>
          <Input type="number" min={0} max={1} step={0.01} {...register('returnRate')} />
        </Field>
        <Field label={`${t('suppliers.form.status')} *`}>
          <select
            {...register('status')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {SUPPLIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`suppliers.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </Field>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          {t('suppliers.form.supportedCategories')} *
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((c) => {
            const active = (supportedCategories ?? []).includes(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => toggleCategory(c)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:border-primary'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
        {errors.supportedCategories?.message && (
          <p className="text-xs text-destructive">{errors.supportedCategories.message}</p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          {t('suppliers.form.supportedPrintMethods')} *
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRINT_METHODS.map((m) => {
            const active = (supportedPrintMethods ?? []).includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => togglePrint(m)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:border-primary'
                }`}
              >
                {m}
              </button>
            );
          })}
        </div>
        {errors.supportedPrintMethods?.message && (
          <p className="text-xs text-destructive">{errors.supportedPrintMethods.message}</p>
        )}
      </fieldset>

      <fieldset className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('supportsWhiteLabel')} />
          {t('suppliers.form.supportsWhiteLabel')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('supportsSample')} />
          {t('suppliers.form.supportsSample')}
        </label>
      </fieldset>

      <Field label={t('suppliers.form.notes')}>
        <textarea
          {...register('notes')}
          rows={3}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </Field>

      {errorMessage && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        <Save className="me-2 h-4 w-4" aria-hidden="true" />
        {submitting ? t('suppliers.form.saving') : t('suppliers.form.save')}
      </Button>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <label className="space-y-1 text-sm">
      <span className="block font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="block text-xs text-destructive">{error}</span>}
    </label>
  );
}
