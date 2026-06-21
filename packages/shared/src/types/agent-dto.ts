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
  name: string;
  result: unknown;
  error?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
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
  message: string;
}

export interface SendMessageResult {
  conversation: Conversation;
  lastMessage: ConversationMessage;
  shouldContinue: boolean;
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
  code: 'AI_AGENT_RATE_LIMITED';
  reason: 'tokens_exceeded' | 'cost_exceeded' | 'turns_exceeded';
  message: string;
}

// -- streaming events (SSE) -----------------------------------------------

export type StreamEventType = 'user_message' | 'assistant_message' | 'complete' | 'error' | 'token';

export interface StreamEvent {
  type: StreamEventType;
  message?: ConversationMessage;
  conversation?: Conversation;
  token?: string;
  code?: string;
  reason?: string;
}

// -- conversation search -------------------------------------------------

export interface SearchConversationsInput {
  query?: string;
  agentType?: AgentType;
  startDate?: string;
  endDate?: string;
}
