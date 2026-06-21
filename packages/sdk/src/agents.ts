import type {
  Conversation,
  ConversationMessage,
  CreateConversationInput,
  CreateConversationResult,
  GetConversationResult,
  SendMessageInput,
  SendMessageResult,
  StreamEvent,
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

  async sendMessageStream(
    conversationId: string,
    input: SendMessageInput,
    onEvent: (event: StreamEvent) => void,
  ): Promise<void> {
    const response = await fetch(
      `${(this.api as any).baseUrl}/api/ai-agents/conversations/${conversationId}/messages/stream`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Stream failed: ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch (err) {
              console.error('Failed to parse SSE:', err);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async searchConversations(
    query?: string,
    agentType?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ conversations: Conversation[] }> {
    const headers: Record<string, string> = {};
    if (query) headers['x-search-query'] = query;
    if (agentType) headers['x-agent-type'] = agentType;
    if (startDate) headers['x-start-date'] = startDate.toISOString();
    if (endDate) headers['x-end-date'] = endDate.toISOString();

    return this.api.request<{ conversations: Conversation[] }>(
      '/api/ai-agents/conversations/search',
      {
        method: 'GET',
        headers,
      },
    );
  }

  async exportConversationPdf(conversationId: string): Promise<Blob> {
    const response = await fetch(
      `${(this.api as any).baseUrl}/api/ai-agents/conversations/${conversationId}/export/pdf`,
      { method: 'GET' },
    );
    if (!response.ok) throw new Error(`Export failed: ${response.statusText}`);
    return response.blob();
  }
}
