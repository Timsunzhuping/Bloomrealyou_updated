import type {
  Conversation,
  CreateConversationInput,
  CreateConversationResult,
  GetConversationResult,
  SendMessageInput,
  SendMessageResult,
} from '@custom-merch/shared';

import type { ApiClient } from './client.js';

export class AgentsClient {
  constructor(private readonly api: ApiClient) {}

  async createConversation(input: CreateConversationInput): Promise<CreateConversationResult> {
    return this.api.request<CreateConversationResult>('/api/ai-agents/conversations', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listConversations(): Promise<{ conversations: Conversation[] }> {
    return this.api.request<{ conversations: Conversation[] }>(
      '/api/ai-agents/conversations',
      {
        method: 'GET',
      },
    );
  }

  async getConversation(conversationId: string): Promise<GetConversationResult> {
    return this.api.request<GetConversationResult>(
      `/api/ai-agents/conversations/${conversationId}`,
      {
        method: 'GET',
      },
    );
  }

  async exportConversation(conversationId: string): Promise<Blob> {
    const response = await fetch(
      `${this.api['baseUrl']}/api/ai-agents/conversations/${conversationId}/export`,
      { method: 'GET' },
    );
    if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
    return response.blob();
  }

  async sendMessage(
    conversationId: string,
    input: SendMessageInput,
  ): Promise<SendMessageResult> {
    return this.api.request<SendMessageResult>(
      `/api/ai-agents/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
    );
  }
}
