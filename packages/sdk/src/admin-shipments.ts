import type {
  AdminShipmentDto,
  CreateShipmentInput,
  OrderTrackingDto,
  UpdateShipmentInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminShipmentListResponse {
  items: AdminShipmentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export class AdminShipmentsClient {
  constructor(private readonly api: ApiClient) {}

  async list(params: {
    q?: string;
    status?: string;
    orderId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<AdminShipmentListResponse> {
    const search = new URLSearchParams();
    if (params.q) search.set('q', params.q);
    if (params.status) search.set('status', params.status);
    if (params.orderId) search.set('orderId', params.orderId);
    if (params.page) search.set('page', String(params.page));
    if (params.pageSize) search.set('pageSize', String(params.pageSize));
    const qs = search.toString();
    return this.api.request<AdminShipmentListResponse>(
      `/admin/shipments${qs ? `?${qs}` : ''}`,
    );
  }

  async create(input: CreateShipmentInput): Promise<AdminShipmentDto> {
    return this.api.request<AdminShipmentDto>('/admin/shipments', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<AdminShipmentDto> {
    return this.api.request<AdminShipmentDto>(`/admin/shipments/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateShipmentInput): Promise<AdminShipmentDto> {
    return this.api.request<AdminShipmentDto>(`/admin/shipments/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  /** Pull a fresh tracking event from the active ShippingProvider. */
  async syncTracking(id: string): Promise<AdminShipmentDto> {
    return this.api.request<AdminShipmentDto>(
      `/admin/shipments/${encodeURIComponent(id)}/sync-tracking`,
      { method: 'POST' },
    );
  }
}

/** Anonymous customer-facing tracking. Reuses the orders namespace so the
 *  same SessionStorage / fetch wiring covers it. */
export class OrderTrackingClient {
  constructor(private readonly api: ApiClient) {}

  async byOrderNumber(orderNumber: string): Promise<OrderTrackingDto> {
    return this.api.request<OrderTrackingDto>(
      `/orders/${encodeURIComponent(orderNumber)}/tracking`,
    );
  }
}
