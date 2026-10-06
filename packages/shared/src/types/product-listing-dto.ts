import type { Currency } from '../constants/currencies';
import type { PrintMethod } from '../constants/print-methods';
import type { ProductCategory } from '../constants/product-categories';

export interface ListingDraft {
  nameZh: string;
  nameEn: string;
  descriptionZh: string;
  descriptionEn: string;
  slug: string;
  category: ProductCategory | '';
  price: string;
  currency: Currency;
  material: string;
  colors: string[];
  sizes: string[];
  productionLeadDays: number | null;
  printMethods: PrintMethod[];
  widthPx: number | null;
  heightPx: number | null;
  offsetXPx: number | null;
  offsetYPx: number | null;
  printAreaConfirmed: boolean;
}

export interface ListingImage {
  id: string;
  name: string;
  url: string;
  originalId: string | null;
  mode: 'original' | 'studio' | 'clean';
  approved: boolean;
}

export interface ListingMessage {
  role: 'assistant' | 'user';
  text: string;
  at: string;
}

export interface ProductListingSession {
  id: string;
  ownerId: string;
  revision: number;
  locale: string;
  state: 'collecting' | 'saved' | 'published';
  draft: ListingDraft;
  images: ListingImage[];
  selectedImageIds: string[];
  mainImageId: string | null;
  messages: ListingMessage[];
  productId: string | null;
  source: 'doubao' | 'model' | 'guided';
  missing: string[];
  createdAt: string;
  updatedAt: string;
}
