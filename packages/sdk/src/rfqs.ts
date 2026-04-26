import type {
  CreateRFQInput,
  RfqDto,
  RFQStatus,
  UpdateRFQStatusInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class RFQsClient {
  constructor(private readonly api: ApiClient) {}

  /** Public — submit an RFQ from the corporate landing form. */
  async create(input: CreateRFQInput): Promise<RfqDto> {
    return this.api.request<RfqDto>('/rfqs', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}

export class AdminRFQsClient {
  constructor(private readonly api: ApiClient) {}

  async list(params?: { status?: RFQStatus }): Promise<{ items: RfqDto[]; total: number }> {
    const query = params?.status ? `?status=${encodeURIComponent(params.status)}` : '';
    return this.api.request<{ items: RfqDto[]; total: number }>(`/admin/rfqs${query}`);
  }

  async get(id: string): Promise<RfqDto> {
    return this.api.request<RfqDto>(`/admin/rfqs/${encodeURIComponent(id)}`);
  }

  async setStatus(id: string, input: UpdateRFQStatusInput): Promise<RfqDto> {
    return this.api.request<RfqDto>(`/admin/rfqs/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }
}
