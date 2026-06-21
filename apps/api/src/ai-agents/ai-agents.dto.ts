export interface CreateConversationRequest {
  agentType: 'sales_copilot' | 'support_agent';
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
}

export interface MessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; name: string; result: unknown; error?: string }>;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  agentType: 'sales_copilot' | 'support_agent';
  messages: MessageDto[];
  tokenCount: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface SendMessageResponse {
  conversation: ConversationDto;
  lastMessage: MessageDto;
  shouldContinue: boolean;
}

export interface GetConversationResponse {
  conversation: ConversationDto;
}
