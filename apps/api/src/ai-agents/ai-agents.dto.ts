export interface CreateConversationRequest {
  agentType: 'sales_copilot' | 'support_agent';
}

export interface SendMessageRequest {
  conversationId: string;
  message: string;
  /** Optional: ID of message this is a reply to (for threading). */
  replyToId?: string;
}

export interface MessageDto {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: Array<{ id: string; name: string; arguments: Record<string, unknown> }>;
  toolResults?: Array<{ toolCallId: string; name: string; result: unknown; error?: string }>;
  createdAt: string;
  replyToId?: string;
}

export interface ConversationDto {
  id: string;
  agentType: 'sales_copilot' | 'support_agent';
  messages: MessageDto[];
  tokenCount: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
  title?: string;
  isBookmarked?: boolean;
  shareToken?: string;
  shareType?: 'private' | 'public' | 'link';
}

export interface SendMessageResponse {
  conversation: ConversationDto;
  lastMessage: MessageDto;
  shouldContinue: boolean;
}

export interface GetConversationResponse {
  conversation: ConversationDto;
}

// --- Bookmarks ---
export interface ToggleBookmarkRequest {
  isBookmarked: boolean;
}

export interface ToggleBookmarkResponse {
  conversation: ConversationDto;
}

// --- Analytics ---
export interface ConversationAnalytics {
  totalConversations: number;
  averageTokensPerConversation: number;
  averageCostPerConversation: number;
  totalTokensUsed: number;
  totalCostIncurred: number;
  conversationsByAgent: Record<string, number>;
  bookmarkedConversations: number;
  messageCountDistribution: {
    min: number;
    max: number;
    average: number;
  };
}

export interface ConversationAnalyticsResponse {
  analytics: ConversationAnalytics;
  period: { startDate: string; endDate: string };
}

// --- Batch Export ---
export interface BatchExportRequest {
  conversationIds: string[];
  format: 'zip' | 'json';
}

// --- Share Token ---
export interface CreateShareTokenRequest {
  shareType: 'public' | 'link';
}

export interface CreateShareTokenResponse {
  shareToken: string;
  shareUrl: string;
  expiresAt?: string;
}
