'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PRINT_METHODS,
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  type AdminProductDto,
  type CreateAdminProductInput,
  type LocalisedString,
  type PrintMethod,
  type ProductCategory,
  type ProductStatus,
  type UpdateAdminProductInput,
} from '@custom-merch/shared';
import { Badge, Button, Input } from '@custom-merch/ui';
import { Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const localisedSchema = z.object({
  en: z.string().min(1).max(500),
  'zh-CN': z.string().max(500).optional().or(z.literal('')),
  es: z.string().max(500).optional().or(z.literal('')),
  ar: z.string().max(500).optional().or(z.literal('')),
});

const productFormSchema = z.object({
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/, 'slug must be kebab-case'),
  category: z.enum(PRODUCT_CATEGORIES),
  status: z.enum(PRODUCT_STATUSES),
  name: localisedSchema,
  description: localisedSchema,
  supportedPrintMethods: z.array(z.enum(PRINT_METHODS)).min(1),
  basePriceCents: z.coerce.number().int().min(0),
  productionLeadDays: z.coerce.number().int().min(0).max(60),
  tags: z.string().optional(),
  seoTitleEn: z.string().max(200).optional(),
  seoDescriptionEn: z.string().max(500).optional(),
  // hidden / managed:
  imageUrls: z.array(z.string()).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface Props {
  initial?: AdminProductDto;
  onSubmit: (
    payload: CreateAdminProductInput | UpdateAdminProductInput,
    extras: { imagesToAdd: string[] },
  ) => Promise<void>;
  submitting?: boolean;
  errorMessage?: string | null;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('read-failed'));
    reader.onload = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function ProductForm({ initial, onSubmit, submitting, errorMessage }: Props): JSX.Element {
  const t = useTranslations('admin');
  const [imageUrls, setImageUrls] = React.useState<string[]>(initial?.imageUrls ?? []);
  const [pendingDataUrls, setPendingDataUrls] = React.useState<string[]>([]);

  const defaults: ProductFormValues = {
    slug: initial?.slug ?? '',
    category: (initial?.category as ProductCategory) ?? 't-shirts',
    status: (initial?.status as ProductStatus) ?? 'draft',
    name: stringMap(initial?.name),
    description: stringMap(initial?.description),
    supportedPrintMethods: initial?.supportedPrintMethods ?? ['dtg'],
    basePriceCents: initial?.basePrice.amountMinor ?? 1999,
    productionLeadDays: initial?.productionLeadDays ?? 5,
    tags: (initial?.tags ?? []).join(', '),
    seoTitleEn: initial?.seoTitle?.en ?? '',
    seoDescriptionEn: initial?.seoDescription?.en ?? '',
    imageUrls: initial?.imageUrls ?? [],
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: defaults,
  });

  const watchPrintMethods = watch('supportedPrintMethods');

  const togglePrintMethod = (method: PrintMethod): void => {
    const current = (watchPrintMethods ?? []) as PrintMethod[];
    setValue(
      'supportedPrintMethods',
      current.includes(method)
        ? current.filter((m) => m !== method)
        : [...current, method],
      { shouldValidate: true },
    );
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = Array.from(e.target.files ?? []);
    const urls: string[] = [];
    for (const f of files) {
      try {
        urls.push(await fileToDataUrl(f));
      } catch {
        /* skip unreadable files */
      }
    }
    setPendingDataUrls((prev) => [...prev, ...urls]);
    e.target.value = '';
  };

  const removeExistingImage = (url: string): void => {
    setImageUrls((prev) => prev.filter((u) => u !== url));
  };
  const removePending = (url: string): void => {
    setPendingDataUrls((prev) => prev.filter((u) => u !== url));
  };

  const submit = handleSubmit(async (values) => {
    const cleanLocalised = (l: ProductFormValues['name']): LocalisedString => ({
      en: l.en,
      ...(l['zh-CN'] ? { 'zh-CN': l['zh-CN'] } : {}),
      ...(l.es ? { es: l.es } : {}),
      ...(l.ar ? { ar: l.ar } : {}),
    });
    const payload: CreateAdminProductInput | UpdateAdminProductInput = {
      slug: values.slug,
      category: values.category,
      status: values.status,
      name: cleanLocalised(values.name),
      description: cleanLocalised(values.description),
      supportedPrintMethods: values.supportedPrintMethods,
      basePriceMinor: values.basePriceCents,
      productionLeadDays: values.productionLeadDays,
      imageUrls,
      imageDataUrls: pendingDataUrls,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      seoTitle: values.seoTitleEn ? { en: values.seoTitleEn } : undefined,
      seoDescription: values.seoDescriptionEn ? { en: values.seoDescriptionEn } : undefined,
    };
    await onSubmit(payload, { imagesToAdd: pendingDataUrls });
    setPendingDataUrls([]);
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2">
        <Field label={`${t('products.form.slug')} *`} error={errors.slug?.message}>
          <Input {...register('slug')} placeholder="classic-cotton-tee" />
        </Field>
        <Field label={`${t('products.form.category')} *`} error={errors.category?.message}>
          <select
            {...register('category')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${t('products.form.status')} *`} error={errors.status?.message}>
          <select
            {...register('status')}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {PRODUCT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`products.statusLabels.${s}`)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label={`${t('products.form.basePrice')} *`}
          hint={t('products.form.basePriceHint')}
          error={errors.basePriceCents?.message}
        >
          <Input type="number" min={0} step={1} {...register('basePriceCents')} />
        </Field>
        <Field
          label={t('products.form.productionLeadDays')}
          error={errors.productionLeadDays?.message}
        >
          <Input type="number" min={0} max={60} {...register('productionLeadDays')} />
        </Field>
        <Field label={t('products.form.tags')} hint={t('products.form.tagsHint')}>
          <Input {...register('tags')} placeholder="organic, unisex" />
        </Field>
      </section>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('products.form.name')} *</legend>
        <LocaleRow prefix="name" register={register} errors={errors.name} required />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('products.form.description')} *</legend>
        <LocaleRow prefix="description" register={register} errors={errors.description} required textarea />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          {t('products.form.supportedPrintMethods')} *
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRINT_METHODS.map((m) => {
            const active = (watchPrintMethods ?? []).includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => togglePrintMethod(m)}
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

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('products.form.images')}</legend>
        <p className="text-xs text-muted-foreground">{t('products.form.imagesHint')}</p>
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url) => (
            <ImagePill
              key={url}
              url={url}
              kind="existing"
              onRemove={() => removeExistingImage(url)}
            />
          ))}
          {pendingDataUrls.map((url) => (
            <ImagePill
              key={url}
              url={url}
              kind="pending"
              onRemove={() => removePending(url)}
            />
          ))}
        </div>
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          multiple
          onChange={onPickImage}
        />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('products.form.seoSection')}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('products.form.seoTitle')}>
            <Input {...register('seoTitleEn')} maxLength={200} />
          </Field>
          <Field label={t('products.form.seoDescription')}>
            <Input {...register('seoDescriptionEn')} maxLength={500} />
          </Field>
        </div>
      </fieldset>

      {errorMessage && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        <Save className="me-2 h-4 w-4" aria-hidden="true" />
        {submitting ? t('products.form.saving') : t('products.form.save')}
      </Button>
    </form>
  );
}

function stringMap(value?: LocalisedString | null): ProductFormValues['name'] {
  return {
    en: value?.en ?? '',
    'zh-CN': value?.['zh-CN'] ?? '',
    es: value?.es ?? '',
    ar: value?.ar ?? '',
  };
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

function LocaleRow({
  prefix,
  register,
  errors,
  required,
  textarea,
}: {
  prefix: 'name' | 'description';
  register: ReturnType<typeof useForm<ProductFormValues>>['register'];
  errors: import('react-hook-form').FieldErrors<ProductFormValues>[typeof prefix];
  required?: boolean;
  textarea?: boolean;
}): JSX.Element {
  const locales: Array<{ key: 'en' | 'zh-CN' | 'es' | 'ar'; flag: string }> = [
    { key: 'en', flag: 'EN' },
    { key: 'zh-CN', flag: '中' },
    { key: 'es', flag: 'ES' },
    { key: 'ar', flag: 'AR' },
  ];
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {locales.map(({ key, flag }) => {
        const fieldName = `${prefix}.${key}` as const;
        const localeErrorMessage = errors?.[key as keyof typeof errors];
        return (
          <label key={key} className="space-y-1 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono">{flag}</span>
              {required && key === 'en' && <span className="text-destructive">*</span>}
            </span>
            {textarea ? (
              <textarea
                {...register(fieldName)}
                rows={3}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <Input {...register(fieldName)} />
            )}
            {localeErrorMessage && typeof localeErrorMessage === 'object' && 'message' in localeErrorMessage && (
              <span className="block text-xs text-destructive">
                {(localeErrorMessage as { message?: string }).message}
              </span>
            )}
          </label>
        );
      })}
    </div>
  );
}

function ImagePill({
  url,
  kind,
  onRemove,
}: {
  url: string;
  kind: 'existing' | 'pending';
  onRemove: () => void;
}): JSX.Element {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt="" className="h-20 w-20 rounded border bg-background object-cover" />
      <Badge
        variant={kind === 'pending' ? 'default' : 'secondary'}
        className="absolute -end-1 -top-1 text-[9px]"
      >
        {kind}
      </Badge>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -bottom-1 -end-1 grid h-5 w-5 place-items-center rounded-full border bg-background text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground"
        aria-label="remove"
      >
        ×
      </button>
    </div>
  );
}
