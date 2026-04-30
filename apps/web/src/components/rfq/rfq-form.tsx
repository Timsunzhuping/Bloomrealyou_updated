'use client';

import {
  PRODUCT_CATEGORIES,
  RFQ_BUDGET_RANGES,
  RFQ_LOGO_MAX_BYTES,
  type CreateRFQInput,
  type ProductCategory,
  type RFQBudgetRange,
} from '@custom-merch/shared';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Label,
  Textarea,
} from '@custom-merch/ui';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { useRouter } from '@/i18n/navigation';
import { getClientApi } from '@/lib/client-api';

import type { Locale } from '@custom-merch/i18n';

interface Props {
  locale: Locale;
}

const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
]);

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (): void => reject(new Error('read-failed'));
    reader.onload = (): void => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

export function RFQForm({ locale }: Props): JSX.Element {
  const t = useTranslations('rfq');
  const router = useRouter();

  const [companyName, setCompanyName] = React.useState('');
  const [contactName, setContactName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [productCategories, setProductCategories] = React.useState<ProductCategory[]>([]);
  const [estimatedQuantity, setEstimatedQuantity] = React.useState('');
  const [targetDeliveryDate, setTargetDeliveryDate] = React.useState('');
  const [budgetRange, setBudgetRange] = React.useState<RFQBudgetRange>('unspecified');
  const [needSample, setNeedSample] = React.useState(false);
  const [note, setNote] = React.useState('');
  const [logoFile, setLogoFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const toggleCategory = (cat: ProductCategory): void => {
    setProductCategories((curr) =>
      curr.includes(cat) ? curr.filter((c) => c !== cat) : [...curr, cat],
    );
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (productCategories.length === 0 || !country.trim() || !estimatedQuantity) {
      setError(t('form.errors.missing'));
      return;
    }

    let logoDataUrl: string | undefined;
    let logoFileName: string | undefined;
    if (logoFile) {
      if (logoFile.size > RFQ_LOGO_MAX_BYTES) {
        setError(t('form.errors.logoSize'));
        return;
      }
      if (!ALLOWED_LOGO_TYPES.has(logoFile.type)) {
        setError(t('form.errors.logoType'));
        return;
      }
      try {
        logoDataUrl = await fileToDataUrl(logoFile);
        logoFileName = logoFile.name;
      } catch {
        setError(t('form.errors.generic'));
        return;
      }
    }

    const payload: CreateRFQInput = {
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      country: country.trim().toUpperCase(),
      productCategories,
      estimatedQuantity: Number(estimatedQuantity),
      targetDeliveryDate: targetDeliveryDate || undefined,
      budgetRange,
      needSample,
      note: note.trim() || undefined,
      logoDataUrl,
      logoFileName,
      locale,
    };

    setSubmitting(true);
    try {
      const rfq = await getClientApi().rfqs.create(payload);
      router.push(`/rfq/success?n=${encodeURIComponent(rfq.rfqNumber)}`);
    } catch {
      setError(t('form.errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border bg-card p-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold">{t('form.title')}</h2>
        <p className="text-sm text-muted-foreground">{t('form.subtitle')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="rfq-company" label={`${t('form.companyName')} *`} required>
          <Input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            maxLength={200}
            required
          />
        </FormField>
        <FormField id="rfq-contact" label={`${t('form.contactName')} *`} required>
          <Input
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            maxLength={200}
            required
          />
        </FormField>
        <FormField id="rfq-email" label={`${t('form.email')} *`} required>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </FormField>
        <FormField id="rfq-phone" label={t('form.phone')}>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={40} />
        </FormField>
        <FormField id="rfq-country" label={`${t('form.country')} *`} required>
          <Input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="US"
            maxLength={2}
            minLength={2}
            required
          />
        </FormField>
        <FormField id="rfq-quantity" label={`${t('form.estimatedQuantity')} *`} required>
          <Input
            type="number"
            min={1}
            value={estimatedQuantity}
            onChange={(e) => setEstimatedQuantity(e.target.value)}
            required
          />
        </FormField>
        <FormField id="rfq-delivery" label={t('form.targetDeliveryDate')}>
          <Input
            type="date"
            value={targetDeliveryDate}
            onChange={(e) => setTargetDeliveryDate(e.target.value)}
          />
        </FormField>
        <FormField id="rfq-budget" label={`${t('form.budgetRange')} *`} required>
          <select
            id="rfq-budget"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={budgetRange}
            onChange={(e) => setBudgetRange(e.target.value as RFQBudgetRange)}
            required
          >
            {RFQ_BUDGET_RANGES.map((b) => (
              <option key={b} value={b}>
                {t(`budgetRanges.${b}`)}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="space-y-2">
        <Label>{`${t('form.productCategories')} *`}</Label>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((cat) => {
            const active = productCategories.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input bg-background text-foreground hover:border-primary'
                }`}
              >
                {t(`categoryLabels.${cat}`)}
              </button>
            );
          })}
        </div>
      </div>

      <FormField id="rfq-logo" label={t('form.logoFile')} hint={t('form.logoFileHint')}>
        <Input
          id="rfq-logo"
          type="file"
          accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
          onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
        />
      </FormField>

      <label className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm">
        <Checkbox
          checked={needSample}
          onCheckedChange={(value) => setNeedSample(value === true)}
        />
        <span>{t('form.needSample')}</span>
      </label>

      <FormField id="rfq-note" label={t('form.note')}>
        <Textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('form.notePlaceholder')}
          maxLength={2000}
        />
      </FormField>

      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" disabled={submitting} size="lg">
        {submitting ? t('form.submitting') : t('form.submit')}
      </Button>
    </form>
  );
}
