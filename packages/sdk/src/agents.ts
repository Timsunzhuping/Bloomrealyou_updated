import type {
  AgentType,
  CreateConversationInput,
  CreateConversationResult,
  GetConversationResult,
  ListConversationsResult,
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

  async getConversation(conversationId: string): Promise<GetConversationResult> {
    return this.api.request<GetConversationResult>(
      `/api/ai-agents/conversations/${conversationId}`,
      {
        method: 'GET',
      },
    );
  }

  async listConversations(): Promise<ListConversationsResult> {
    return this.api.request<ListConversationsResult>('/api/ai-agents/conversations', {
      method: 'GET',
    });
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
