import type {
  AccountOrderDetailDto,
  AccountProfileDto,
  AccountQuoteSummaryDto,
  CartDto,
  CustomerDesignDto,
  OrderDto,
  ReorderInput,
  SaveAddressInput,
  SavedAddressDto,
  UpdateAccountProfileInput,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AccountClient {
  constructor(private readonly api: ApiClient) {}

  // -- Profile -----------------------------------------------------------

  async getProfile(): Promise<AccountProfileDto> {
    return this.api.request<AccountProfileDto>('/account/profile');
  }

  async updateProfile(input: UpdateAccountProfileInput): Promise<AccountProfileDto> {
    return this.api.request<AccountProfileDto>('/account/profile', {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  // -- Addresses ---------------------------------------------------------

  async listAddresses(): Promise<SavedAddressDto[]> {
    return this.api.request<SavedAddressDto[]>('/account/addresses');
  }

  async saveAddress(input: SaveAddressInput): Promise<SavedAddressDto> {
    return this.api.request<SavedAddressDto>('/account/addresses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async updateAddress(id: string, input: Partial<SaveAddressInput>): Promise<SavedAddressDto> {
    return this.api.request<SavedAddressDto>(`/account/addresses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  }

  async removeAddress(id: string): Promise<{ ok: true }> {
    return this.api.request<{ ok: true }>(`/account/addresses/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  // -- Orders ------------------------------------------------------------

  async listOrders(): Promise<OrderDto[]> {
    return this.api.request<OrderDto[]>('/account/orders');
  }

  async getOrder(orderNumber: string): Promise<AccountOrderDetailDto> {
    return this.api.request<AccountOrderDetailDto>(
      `/account/orders/${encodeURIComponent(orderNumber)}`,
    );
  }

  // -- Designs -----------------------------------------------------------

  async listDesigns(): Promise<CustomerDesignDto[]> {
    return this.api.request<CustomerDesignDto[]>('/account/designs');
  }

  async reorder(designId: string, input: ReorderInput = {}): Promise<CartDto> {
    return this.api.request<CartDto>(
      `/account/designs/${encodeURIComponent(designId)}/reorder`,
      { method: 'POST', body: JSON.stringify(input) },
    );
  }

  // -- Quotes ------------------------------------------------------------

  async listQuotes(): Promise<AccountQuoteSummaryDto[]> {
    return this.api.request<AccountQuoteSummaryDto[]>('/account/quotes');
  }
}
