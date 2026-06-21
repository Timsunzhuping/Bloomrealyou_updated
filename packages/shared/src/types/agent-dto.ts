/**
 * Wire-format DTOs for the AI agent conversational APIs (Sales Copilot, Support Agent).
 */

export type AgentType = 'sales_copilot' | 'support_agent';

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  agentType: AgentType;
  messages: ConversationMessage[];
  tokenCount: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

// -- create-conversation --------------------------------------------------

export interface CreateConversationInput {
  agentType: AgentType;
}

export interface CreateConversationResult {
  conversation: Conversation;
}

// -- send-message ---------------------------------------------------------

export interface SendMessageInput {
  content: string;
}

export interface SendMessageResult {
  message: ConversationMessage;
  toolResults?: ToolResult[];
  updatedConversation: Conversation;
}

// -- get-conversation -----------------------------------------------------

export interface GetConversationResult {
  conversation: Conversation;
}

// -- list-conversations ---------------------------------------------------

export interface ListConversationsResult {
  conversations: Conversation[];
}

// -- rate-limit error (HTTP 429) ------------------------------------------

export interface RateLimitError {
  error: string;
  reason: 'tokens_exceeded' | 'cost_exceeded' | 'turns_exceeded';
  limit: number;
  used: number;
  resetAt: string;
}
