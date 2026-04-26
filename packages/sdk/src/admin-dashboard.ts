import type { AdminDashboardSnapshot } from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AdminDashboardClient {
  constructor(private readonly api: ApiClient) {}

  async get(): Promise<AdminDashboardSnapshot> {
    return this.api.request<AdminDashboardSnapshot>('/admin/dashboard');
  }
}
