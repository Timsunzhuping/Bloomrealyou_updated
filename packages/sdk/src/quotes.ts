import type {
  ConvertQuoteToOrderInput,
  CreateQuoteInput,
  OrderDto,
  QuoteDto,
  QuoteStatus,
  UpdateQuoteInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AdminQuotesClient {
  constructor(private readonly api: ApiClient) {}

  async createForRfq(rfqId: string, input: CreateQuoteInput): Promise<QuoteDto> {
    return this.api.request<QuoteDto>(`/admin/rfqs/${encodeURIComponent(rfqId)}/quotes`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async list(params?: {
    status?: QuoteStatus;
    rfqId?: string;
  }): Promise<{ items: QuoteDto[]; total: number }> {
    const search = new URLSearchParams();
    if (params?.status) search.set('status', params.status);
    if (params?.rfqId) search.set('rfqId', params.rfqId);
    const qs = search.toString();
    return this.api.request<{ items: QuoteDto[]; total: number }>(
      `/admin/quotes${qs ? `?${qs}` : ''}`,
    );
  }

  async get(id: string): Promise<QuoteDto> {
    return this.api.request<QuoteDto>(`/admin/quotes/${encodeURIComponent(id)}`);
  }

  async update(id: string, input: UpdateQuoteInput): Promise<QuoteDto> {
    return this.api.request<QuoteDto>(`/admin/quotes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async convertToOrder(id: string, input: ConvertQuoteToOrderInput): Promise<OrderDto> {
    return this.api.request<OrderDto>(
      `/admin/quotes/${encodeURIComponent(id)}/convert-to-order`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }
}
