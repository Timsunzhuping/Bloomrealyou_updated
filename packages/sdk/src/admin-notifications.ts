import type { Locale, NotificationResult } from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export interface AdminNotificationTemplate {
  key: string;
  locales: Locale[];
  enSubject: string;
}

export interface AdminTestSendResult {
  providerName: string;
  result: NotificationResult;
  preview: { subject: string; text: string };
}

export class AdminNotificationsClient {
  constructor(private readonly api: ApiClient) {}

  async listTemplates(): Promise<{ items: AdminNotificationTemplate[] }> {
    return this.api.request<{ items: AdminNotificationTemplate[] }>(
      '/admin/notifications/templates',
    );
  }

  async testSend(input: {
    to: string;
    templateKey: string;
    locale?: Locale;
    data?: Record<string, unknown>;
  }): Promise<AdminTestSendResult> {
    return this.api.request<AdminTestSendResult>('/admin/notifications/test', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
}
