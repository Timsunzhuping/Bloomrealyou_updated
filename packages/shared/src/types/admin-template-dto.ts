import type { ProductCategory } from '../constants/product-categories';

import type { LocalisedString } from './product';

/** Editable fields exposed by a template's customizer overlay, e.g. `name`, `tagline`. */
export interface TemplateEditableField {
  key: string;
  label: LocalisedString;
  /** UI hint for the storefront customizer. */
  type: 'text' | 'image' | 'color';
  defaultValue?: string;
  required?: boolean;
}

export interface AdminTemplateDto {
  id: string;
  name: LocalisedString;
  description?: LocalisedString | null;
  /** Categories the template is offered to in the customizer entry point. */
  supportedCategories: ProductCategory[];
  /** Optional anchor product (single-product templates). */
  productId?: string | null;
  previewImageUrl: string;
  /** Authored design payload that seeds the customizer when the template is picked. */
  designJson: Record<string, unknown>;
  editableFields: TemplateEditableField[];
  isFeatured: boolean;
  /** When false the template is hidden from the storefront. */
  isPublished: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminTemplateInput {
  name: LocalisedString;
  description?: LocalisedString;
  supportedCategories: ProductCategory[];
  productId?: string;
  /** Either previewImageUrl (already hosted) or previewDataUrl (uploaded). */
  previewImageUrl?: string;
  previewDataUrl?: string;
  designJson: Record<string, unknown>;
  editableFields?: TemplateEditableField[];
  isFeatured?: boolean;
  isPublished?: boolean;
  tags?: string[];
}

export interface UpdateAdminTemplateInput {
  name?: LocalisedString;
  description?: LocalisedString | null;
  supportedCategories?: ProductCategory[];
  productId?: string | null;
  previewImageUrl?: string;
  previewDataUrl?: string;
  designJson?: Record<string, unknown>;
  editableFields?: TemplateEditableField[];
  isFeatured?: boolean;
  isPublished?: boolean;
  tags?: string[];
}
