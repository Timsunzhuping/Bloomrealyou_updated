import type {
  AddCartItemInput,
  CartDto,
  RecalculateCartInput,
  UpdateCartItemInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class CartClient {
  constructor(private readonly api: ApiClient) {}

  async get(): Promise<CartDto> {
    return this.api.request<CartDto>('/cart', { method: 'GET' });
  }

  async addItem(input: AddCartItemInput): Promise<CartDto> {
    return this.api.request<CartDto>('/cart/items', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateItem(itemId: string, input: UpdateCartItemInput): Promise<CartDto> {
    return this.api.request<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async removeItem(itemId: string): Promise<CartDto> {
    return this.api.request<CartDto>(`/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'DELETE',
    });
  }

  async recalculate(input: RecalculateCartInput = {}): Promise<CartDto> {
    return this.api.request<CartDto>('/cart/recalculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
