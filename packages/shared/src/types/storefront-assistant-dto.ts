import type { Locale } from '../constants/locales';
import type { OrderStatus } from '../constants/statuses';
import type { Money } from './common';

export type StorefrontAssistantMode = 'shop' | 'design' | 'support';
export type StorefrontAssistantAction =
  | 'products'
  | 'design'
  | 'cart'
  | 'checkout'
  | 'orders'
  | 'contact';
export interface StorefrontAssistantHistory {
  role: 'user' | 'assistant';
  content: string;
}
export interface StorefrontAssistantInput {
  message: string;
  locale: Locale;
  mode: StorefrontAssistantMode;
  productSlug?: string;
  history: StorefrontAssistantHistory[];
}
export interface StorefrontAssistantProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  imageUrl: string | null;
  basePrice: Money;
  printMethods: string[];
  productionLeadDays: number;
  colors: string[];
  sizes: string[];
}
export interface StorefrontAssistantOrder {
  orderNumber: string;
  status: OrderStatus;
  placedAt: string;
  total: Money;
}
export interface StorefrontAssistantResponse {
  reply: string;
  source: 'model' | 'fallback';
  products: StorefrontAssistantProduct[];
  orders: StorefrontAssistantOrder[];
  actions: StorefrontAssistantAction[];
  cartItemCount: number;
}
