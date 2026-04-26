import type {
  AdminSupplierDto,
  AdminSupplierProductMappingDto,
  CreateAdminMappingInput,
  CreateAdminSupplierInput,
  SupplierRecommendInput,
  SupplierRecommendResponse,
  UpdateAdminMappingInput,
  UpdateAdminSupplierInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminSupplierListResponse {
  items: AdminSupplierDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminSupplierMappingListResponse {
  items: AdminSupplierProductMappingDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminSuppliersClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    country?: string;
    status?: string;
    category?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminSupplierListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.country) search.set('country', params.country);
    if (params.status) search.set('status', params.status);
    if (params.category) search.set('category', params.category);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminSupplierListResponse>(
      `/admin/suppliers${qs ? `?${qs}` : ''}`,
    );
  }

  async create(input: CreateAdminSupplierInput): Promise<AdminSupplierDto> {
    return this.api.request<AdminSupplierDto>('/admin/suppliers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<AdminSupplierDto> {
    return this.api.request<AdminSupplierDto>(`/admin/suppliers/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateAdminSupplierInput): Promise<AdminSupplierDto> {
    return this.api.request<AdminSupplierDto>(`/admin/suppliers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    await this.api.request<void>(`/admin/suppliers/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  async recommend(input: SupplierRecommendInput): Promise<SupplierRecommendResponse> {
    return this.api.request<SupplierRecommendResponse>('/admin/suppliers/recommend', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // ── mappings ──
  async listMappings(params: {
    supplierId?: string;
    productId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminSupplierMappingListResponse> {
    const search = new URLSearchParams();
    if (params.supplierId) search.set('supplierId', params.supplierId);
    if (params.productId) search.set('productId', params.productId);
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminSupplierMappingListResponse>(
      `/admin/supplier-product-mappings${qs ? `?${qs}` : ''}`,
    );
  }

  async createMapping(input: CreateAdminMappingInput): Promise<AdminSupplierProductMappingDto> {
    return this.api.request<AdminSupplierProductMappingDto>('/admin/supplier-product-mappings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateMapping(
    id: string,
    input: UpdateAdminMappingInput,
  ): Promise<AdminSupplierProductMappingDto> {
    return this.api.request<AdminSupplierProductMappingDto>(
      `/admin/supplier-product-mappings/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }
}
