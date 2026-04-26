import type {
  AdminProductDto,
  CreateAdminProductInput,
  UpdateAdminProductInput,
  UpsertPriceTierInput,
  UpsertPrintAreaInput,
  UpsertVariantInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminProductListResponse {
  items: AdminProductDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminProductsClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    category?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminProductListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.category) search.set('category', params.category);
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminProductListResponse>(
      `/admin/products${qs ? `?${qs}` : ''}`,
    );
  }

  async create(input: CreateAdminProductInput): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateAdminProductInput): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    await this.api.request<void>(`/admin/products/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // ── nested resources ──
  async upsertVariant(input: UpsertVariantInput & { id?: string }): Promise<AdminProductDto> {
    if (input.id) {
      return this.api.request<AdminProductDto>(
        `/admin/product-variants/${encodeURIComponent(input.id)}`,
        { method: 'PATCH', body: JSON.stringify(input) },
      );
    }
    return this.api.request<AdminProductDto>('/admin/product-variants', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deleteVariant(productId: string, variantId: string): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>(
      `/admin/product-variants/${encodeURIComponent(variantId)}?productId=${encodeURIComponent(productId)}`,
      { method: 'DELETE' },
    );
  }

  async upsertPrintArea(input: UpsertPrintAreaInput & { id?: string }): Promise<AdminProductDto> {
    if (input.id) {
      return this.api.request<AdminProductDto>(
        `/admin/product-print-areas/${encodeURIComponent(input.id)}`,
        { method: 'PATCH', body: JSON.stringify(input) },
      );
    }
    return this.api.request<AdminProductDto>('/admin/product-print-areas', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePrintArea(productId: string, printAreaId: string): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>(
      `/admin/product-print-areas/${encodeURIComponent(printAreaId)}?productId=${encodeURIComponent(productId)}`,
      { method: 'DELETE' },
    );
  }

  async upsertPriceTier(input: UpsertPriceTierInput & { id?: string }): Promise<AdminProductDto> {
    if (input.id) {
      return this.api.request<AdminProductDto>(
        `/admin/product-price-tiers/${encodeURIComponent(input.id)}`,
        { method: 'PATCH', body: JSON.stringify(input) },
      );
    }
    return this.api.request<AdminProductDto>('/admin/product-price-tiers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async deletePriceTier(productId: string, tierId: string): Promise<AdminProductDto> {
    return this.api.request<AdminProductDto>(
      `/admin/product-price-tiers/${encodeURIComponent(tierId)}?productId=${encodeURIComponent(productId)}`,
      { method: 'DELETE' },
    );
  }
}
