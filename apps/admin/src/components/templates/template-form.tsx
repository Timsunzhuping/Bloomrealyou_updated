'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  PRODUCT_CATEGORIES,
  type AdminTemplateDto,
  type CreateAdminTemplateInput,
  type LocalisedString,
  type ProductCategory,
  type TemplateEditableField,
  type UpdateAdminTemplateInput,
} from '@custom-merch/shared';
import { Button, Input } from '@custom-merch/ui';
import { Save, Trash2 } from 'lucide-react';
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

const formSchema = z.object({
  name: localisedSchema,
  descriptionEn: z.string().max(500).optional(),
  supportedCategories: z.array(z.enum(PRODUCT_CATEGORIES)).min(1),
  designJsonText: z.string().min(2).refine((s) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  }, 'must be valid JSON'),
  isFeatured: z.boolean(),
  isPublished: z.boolean(),
  tags: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('read-failed'));
    reader.onload = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

interface Props {
  initial?: AdminTemplateDto;
  onSubmit: (payload: CreateAdminTemplateInput | UpdateAdminTemplateInput) => Promise<void>;
  submitting?: boolean;
  errorMessage?: string | null;
}

export function TemplateForm({ initial, onSubmit, submitting, errorMessage }: Props): JSX.Element {
  const t = useTranslations('admin');
  const [previewUrl, setPreviewUrl] = React.useState<string | undefined>(initial?.previewImageUrl);
  const [previewDataUrl, setPreviewDataUrl] = React.useState<string | undefined>(undefined);
  const [editableFields, setEditableFields] = React.useState<TemplateEditableField[]>(
    initial?.editableFields ?? [],
  );
  const [newField, setNewField] = React.useState<{ key: string; labelEn: string; type: 'text' | 'image' | 'color' }>({
    key: '',
    labelEn: '',
    type: 'text',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: stringMap(initial?.name),
      descriptionEn: initial?.description?.en ?? '',
      supportedCategories: (initial?.supportedCategories as ProductCategory[]) ?? ['t-shirts'],
      designJsonText: JSON.stringify(initial?.designJson ?? { areas: [] }, null, 2),
      isFeatured: initial?.isFeatured ?? false,
      isPublished: initial?.isPublished ?? false,
      tags: (initial?.tags ?? []).join(', '),
    },
  });

  const supported = watch('supportedCategories');

  const toggleCategory = (cat: ProductCategory): void => {
    const curr = supported ?? [];
    setValue(
      'supportedCategories',
      curr.includes(cat) ? curr.filter((c) => c !== cat) : [...curr, cat],
      { shouldValidate: true },
    );
  };

  const onPickPreview = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await fileToDataUrl(file);
    setPreviewDataUrl(url);
    setPreviewUrl(url);
  };

  const addEditableField = (): void => {
    if (!newField.key || !newField.labelEn) return;
    setEditableFields((prev) => [
      ...prev,
      { key: newField.key, label: { en: newField.labelEn }, type: newField.type },
    ]);
    setNewField({ key: '', labelEn: '', type: 'text' });
  };
  const removeEditableField = (key: string): void => {
    setEditableFields((prev) => prev.filter((f) => f.key !== key));
  };

  const submit = handleSubmit(async (values) => {
    const cleanLocalised = (l: FormValues['name']): LocalisedString => ({
      en: l.en,
      ...(l['zh-CN'] ? { 'zh-CN': l['zh-CN'] } : {}),
      ...(l.es ? { es: l.es } : {}),
      ...(l.ar ? { ar: l.ar } : {}),
    });
    const payload: CreateAdminTemplateInput | UpdateAdminTemplateInput = {
      name: cleanLocalised(values.name),
      description: values.descriptionEn ? { en: values.descriptionEn } : undefined,
      supportedCategories: values.supportedCategories,
      designJson: JSON.parse(values.designJsonText) as Record<string, unknown>,
      isFeatured: values.isFeatured,
      isPublished: values.isPublished,
      tags: values.tags
        ? values.tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
      editableFields,
      previewImageUrl: previewUrl,
      previewDataUrl,
    };
    await onSubmit(payload);
  });

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('templates.form.name')} *</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {(['en', 'zh-CN', 'es', 'ar'] as const).map((key) => (
            <label key={key} className="space-y-1 text-sm">
              <span className="block font-mono text-[11px] font-medium uppercase">{key}</span>
              <Input {...register(`name.${key}` as const)} />
              {key === 'en' && errors.name?.en?.message && (
                <span className="text-xs text-destructive">{errors.name.en.message}</span>
              )}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('templates.form.descriptionEn')}</span>
        <textarea
          {...register('descriptionEn')}
          rows={3}
          className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">
          {t('templates.form.supportedCategories')} *
        </legend>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((c) => {
            const active = (supported ?? []).includes(c);
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
        <legend className="text-sm font-semibold">{t('templates.form.preview')} *</legend>
        {previewUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="h-32 w-32 rounded border object-cover"
            />
          </>
        )}
        <Input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={onPickPreview}
        />
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('templates.form.designJson')} *</legend>
        <p className="text-xs text-muted-foreground">{t('templates.form.designJsonHint')}</p>
        <textarea
          {...register('designJsonText')}
          rows={10}
          className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {errors.designJsonText?.message && (
          <p className="text-xs text-destructive">{errors.designJsonText.message}</p>
        )}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">{t('templates.form.editableFields')}</legend>
        <p className="text-xs text-muted-foreground">{t('templates.form.editableFieldsHint')}</p>
        <ul className="divide-y rounded border bg-background">
          {editableFields.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {t('templates.form.editableFieldsEmpty')}
            </li>
          )}
          {editableFields.map((f) => (
            <li key={f.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs">{f.key}</span>
                <span>{f.label.en}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {f.type}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeEditableField(f.key)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="remove"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="grid gap-2 sm:grid-cols-4">
          <input
            placeholder={t('templates.form.fieldKey')}
            value={newField.key}
            onChange={(e) => setNewField({ ...newField, key: e.target.value })}
            className="h-9 rounded border border-input bg-background px-2 text-sm"
          />
          <input
            placeholder={t('templates.form.fieldLabel')}
            value={newField.labelEn}
            onChange={(e) => setNewField({ ...newField, labelEn: e.target.value })}
            className="h-9 rounded border border-input bg-background px-2 text-sm"
          />
          <select
            value={newField.type}
            onChange={(e) =>
              setNewField({ ...newField, type: e.target.value as 'text' | 'image' | 'color' })
            }
            className="h-9 rounded border border-input bg-background px-2 text-sm"
          >
            <option value="text">text</option>
            <option value="image">image</option>
            <option value="color">color</option>
          </select>
          <Button type="button" size="sm" onClick={addEditableField}>
            {t('templates.form.addField')}
          </Button>
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('isFeatured')} />
          {t('templates.form.isFeatured')}
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('isPublished')} />
          {t('templates.form.isPublished')}
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="block font-medium">{t('templates.form.tags')}</span>
        <Input {...register('tags')} placeholder="conference, gift, holiday" />
      </label>

      {errorMessage && (
        <p className="rounded border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          {errorMessage}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        <Save className="me-2 h-4 w-4" aria-hidden="true" />
        {submitting ? t('templates.form.saving') : t('templates.form.save')}
      </Button>
    </form>
  );
}

function stringMap(value?: LocalisedString | null): { en: string; 'zh-CN': string; es: string; ar: string } {
  return {
    en: value?.en ?? '',
    'zh-CN': value?.['zh-CN'] ?? '',
    es: value?.es ?? '',
    ar: value?.ar ?? '',
  };
}
