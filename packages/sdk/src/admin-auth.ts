import type { AdminLoginInput, AdminLoginResponse, AdminUserDto } from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AdminAuthClient {
  constructor(private readonly api: ApiClient) {}

  async login(input: AdminLoginInput): Promise<AdminLoginResponse> {
    const response = await this.api.request<AdminLoginResponse>('/admin/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    this.api.setAdminToken(response.token);
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.api.request<void>('/admin/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.api.setAdminToken(null);
    }
  }

  async me(): Promise<AdminUserDto> {
    return this.api.request<AdminUserDto>('/admin/auth/me');
  }
}
