import type {
  AdminProductionJobDto,
  AssignProductionSupplierInput,
  CreateProductionJobInput,
  UpdateProductionJobStatusInput,
  UploadQcResultInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminProductionJobListResponse {
  items: AdminProductionJobDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminProductionClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    status?: string;
    supplierId?: string;
    orderId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminProductionJobListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.supplierId) search.set('supplierId', params.supplierId);
    if (params.orderId) search.set('orderId', params.orderId);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminProductionJobListResponse>(
      `/admin/production-jobs${qs ? `?${qs}` : ''}`,
    );
  }

  async create(input: CreateProductionJobInput): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>('/admin/production-jobs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/admin/production-jobs/${encodeURIComponent(id)}`,
    );
  }

  async setStatus(
    id: string,
    input: UpdateProductionJobStatusInput,
  ): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/admin/production-jobs/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }

  async assignSupplier(
    id: string,
    input: AssignProductionSupplierInput,
  ): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/admin/production-jobs/${encodeURIComponent(id)}/assign-supplier`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  async uploadQc(id: string, input: UploadQcResultInput): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/admin/production-jobs/${encodeURIComponent(id)}/upload-qc`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }
}
