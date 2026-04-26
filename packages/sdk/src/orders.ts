import type { CreateOrderInput, OrderDto } from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class OrdersClient {
  constructor(private readonly api: ApiClient) {}

  async create(input: CreateOrderInput): Promise<OrderDto> {
    return this.api.request<OrderDto>('/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async get(id: string): Promise<OrderDto> {
    return this.api.request<OrderDto>(`/orders/${encodeURIComponent(id)}`);
  }

  async getByNumber(orderNumber: string): Promise<OrderDto> {
    return this.api.request<OrderDto>(
      `/orders/by-number/${encodeURIComponent(orderNumber)}`,
    );
  }
}
