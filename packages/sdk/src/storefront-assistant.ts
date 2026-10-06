import type { StorefrontAssistantInput, StorefrontAssistantResponse } from '@custom-merch/shared';
import type { ApiClient } from './client.js';

export class StorefrontAssistantClient {
  constructor(private readonly api: ApiClient) {}
  chat(
    input: StorefrontAssistantInput,
    signal?: AbortSignal,
  ): Promise<StorefrontAssistantResponse> {
    return this.api.request('/storefront-assistant/chat', {
      method: 'POST',
      body: JSON.stringify(input),
      signal,
    });
  }
}
