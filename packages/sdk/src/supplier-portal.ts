import type {
  AdminProductionJobDto,
  UploadQcResultInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface SupplierPortalListResponse {
  items: AdminProductionJobDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Supplier-portal client. The endpoints are scoped to the authenticated
 * supplier_user account and reject (403) any cross-supplier access.
 */
export class SupplierPortalClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    status?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<SupplierPortalListResponse> {
    const search = new URLSearchParams();
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<SupplierPortalListResponse>(
      `/supplier-portal/production-jobs${qs ? `?${qs}` : ''}`,
    );
  }

  async get(id: string): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/supplier-portal/production-jobs/${encodeURIComponent(id)}`,
    );
  }

  async confirm(id: string): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/supplier-portal/production-jobs/${encodeURIComponent(id)}/confirm`,
      { method: 'POST' },
    );
  }

  async start(id: string): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/supplier-portal/production-jobs/${encodeURIComponent(id)}/start`,
      { method: 'POST' },
    );
  }

  async uploadQc(id: string, input: UploadQcResultInput): Promise<AdminProductionJobDto> {
    return this.api.request<AdminProductionJobDto>(
      `/supplier-portal/production-jobs/${encodeURIComponent(id)}/upload-qc`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }
}
