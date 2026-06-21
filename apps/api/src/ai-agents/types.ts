/** Represents a single message in a conversation. */
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  createdAt: string;
  /** Optional: ID of message this is a reply to (threading). */
  replyToId?: string;
}

/** Represents a tool invocation from the LLM. */
export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Represents the result of a tool execution. */
export interface ToolResult {
  toolCallId: string;
  name: string;
  result: unknown;
  error?: string;
}

/** Represents a conversation's full state. */
export interface Conversation {
  id: string;
  userId: string;
  /** Optional cart/checkout session this conversation operates on. */
  sessionId: string | null;
  agentType: 'sales_copilot' | 'support_agent';
  messages: ConversationMessage[];
  tokenCount: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  /** Auto-generated title based on first message (Phase 4). */
  title?: string;
  /** Whether conversation is bookmarked/starred. */
  isBookmarked?: boolean;
  /** Search index for full-text search (comma-separated keywords). */
  searchIndex?: string;
  /** Share token for public/private sharing. */
  shareToken?: string;
  /** Share type: 'private' (default), 'public', 'link'. */
  shareType?: 'private' | 'public' | 'link';

  // Phase 5+ features
  /** Custom user tags for organization (Phase 5). */
  tags?: string[];
  /** Auto-generated summary of conversation (Phase 5). */
  summary?: string;
  /** Access control list for shared conversations (Phase 5). */
  permissions?: ConversationPermission[];
  /** Merged conversation IDs (Phase 5). */
  mergedFrom?: string[];
  /** Conversation insights/predictions (Phase 5). */
  insights?: ConversationInsights;
}

/** Permission entry for role-based access control. */
export interface ConversationPermission {
  userId: string;
  role: 'viewer' | 'editor' | 'commenter';
  grantedAt: string;
}

/** AI-generated insights and predictions. */
export interface ConversationInsights {
  sentiment?: 'positive' | 'neutral' | 'negative';
  topic?: string;
  completionLikelihood?: number;
  nextActionSuggested?: string;
  generatedAt?: string;
}

/**
 * Per-turn context handed to tool executors so they can act on behalf of the
 * conversation's user (e.g. create an order against their cart session).
 */
export interface ToolContext {
  userId: string;
  sessionId: string | null;
  conversationId: string;
  agentType: 'sales_copilot' | 'support_agent';
}

/** Tool definition for function calling. */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** LLM provider interface. */
export interface LLMProvider {
  name: string;
  generateResponse(
    messages: ConversationMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): Promise<LLMResponse>;
  countTokens(text: string): number;
  estimateCost(tokenCount: number): number;
}

/** Response from LLM including tool calls if any. */
export interface LLMResponse {
  content: string;
  toolCalls: ToolCall[];
  tokenCount: number;
  cost: number;
}

/** Function signature for tool execution. */
export type ToolExecutorFunction = (
  input: Record<string, unknown>,
  context: ToolContext,
) => Promise<unknown>;

/** Agent turn result. */
export interface AgentTurnResult {
  message: ConversationMessage;
  toolResults?: ToolResult[];
  shouldContinue: boolean;
}
