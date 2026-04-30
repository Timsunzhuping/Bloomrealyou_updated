import type {
  AdminTemplateDto,
  CreateAdminTemplateInput,
  UpdateAdminTemplateInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminTemplateListResponse {
  items: AdminTemplateDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminTemplatesClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    category?: string;
    isPublished?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminTemplateListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.category) search.set('category', params.category);
    if (typeof params.isPublished === 'boolean') {
      search.set('isPublished', String(params.isPublished));
    }
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminTemplateListResponse>(
      `/admin/templates${qs ? `?${qs}` : ''}`,
    );
  }

  async create(input: CreateAdminTemplateInput): Promise<AdminTemplateDto> {
    return this.api.request<AdminTemplateDto>('/admin/templates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<AdminTemplateDto> {
    return this.api.request<AdminTemplateDto>(`/admin/templates/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateAdminTemplateInput): Promise<AdminTemplateDto> {
    return this.api.request<AdminTemplateDto>(`/admin/templates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async delete(id: string): Promise<void> {
    await this.api.request<void>(`/admin/templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }
}
