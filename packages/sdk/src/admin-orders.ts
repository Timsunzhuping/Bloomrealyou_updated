import type {
  AdminOrderDetailExtras,
  AdminOrderNoteInput,
  AdminOrderStatusUpdateInput,
  OrderDto,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export type AdminOrderSummary = OrderDto & AdminOrderDetailExtras;

export interface AdminOrderListResponse {
  items: AdminOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminOrdersClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    status?: string;
    flaggedOnly?: boolean;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminOrderListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.flaggedOnly) search.set('flaggedOnly', 'true');
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminOrderListResponse>(
      `/admin/orders${qs ? `?${qs}` : ''}`,
    );
  }

  async get(id: string): Promise<AdminOrderSummary> {
    return this.api.request<AdminOrderSummary>(`/admin/orders/${encodeURIComponent(id)}`);
  }

  async setStatus(id: string, input: AdminOrderStatusUpdateInput): Promise<AdminOrderSummary> {
    return this.api.request<AdminOrderSummary>(
      `/admin/orders/${encodeURIComponent(id)}/status`,
      { method: 'PATCH', body: JSON.stringify(input) },
    );
  }

  async appendNote(id: string, input: AdminOrderNoteInput): Promise<AdminOrderSummary> {
    return this.api.request<AdminOrderSummary>(
      `/admin/orders/${encodeURIComponent(id)}/notes`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }
}
