import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import type { Conversation, ConversationMessage, ToolResult } from '../types';

/**
 * Manages conversation history and message state.
 * In-memory for now; future: persist via SnapshotStore.
 */
@Injectable()
export class ConversationManager {
  private readonly log = new Logger(ConversationManager.name);
  private readonly conversations = new Map<string, Conversation>();

  createConversation(userId: string, agentType: 'sales_copilot' | 'support_agent'): Conversation {
    const conversation: Conversation = {
      id: `conv_${randomUUID().slice(0, 8)}`,
      userId,
      agentType,
      messages: [],
      tokenCount: 0,
      totalCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  getConversation(conversationId: string): Conversation | undefined {
    return this.conversations.get(conversationId);
  }

  addUserMessage(conversationId: string, content: string): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const message: ConversationMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    };
    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();
    return message;
  }

  addAssistantMessage(
    conversationId: string,
    content: string,
    toolCalls: Array<{ id: string; name: string; arguments: Record<string, unknown> }> = [],
    tokenCount: number = 0,
    cost: number = 0,
  ): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const message: ConversationMessage = {
      id: randomUUID(),
      role: 'assistant',
      content,
      toolCalls,
      createdAt: new Date().toISOString(),
    };
    conversation.messages.push(message);
    conversation.tokenCount += tokenCount;
    conversation.totalCost += cost;
    conversation.updatedAt = new Date().toISOString();
    return message;
  }

  addToolResults(conversationId: string, toolResults: ToolResult[]): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    if (conversation.messages.length === 0) {
      throw new Error('No assistant message to attach tool results to');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new Error('Tool results can only be added after assistant messages');
    }

    if (!lastMessage.toolResults) {
      lastMessage.toolResults = [];
    }
    lastMessage.toolResults.push(...toolResults);
    conversation.updatedAt = new Date().toISOString();
  }

  getMessages(conversationId: string): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
    return conversation.messages;
  }
}
