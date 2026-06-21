import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { SnapshotStore } from '../../_lib/snapshot-store';
import type { Conversation, ConversationMessage, ToolResult } from '../types';

/** Durable agent conversations survive API restarts (snapshot kind). */
const KIND = 'ai_conversation';

/**
 * Manages conversation history and message state.
 *
 * The in-memory map is the runtime source of truth; the {@link SnapshotStore}
 * makes it durable across restarts so an in-progress chat (and its accumulated
 * token/cost totals) survives a redeploy. Every mutation write-throughs the
 * full conversation as JSON; on boot the map is primed from the durable store.
 */
@Injectable()
export class ConversationManager implements OnModuleInit {
  private readonly log = new Logger(ConversationManager.name);
  private readonly conversations = new Map<string, Conversation>();

  constructor(private readonly snapshots: SnapshotStore) {}

  async onModuleInit(): Promise<void> {
    const rows = await this.snapshots.loadAll<Conversation>(KIND);
    for (const row of rows) {
      this.conversations.set(row.data.id, row.data);
    }
    if (rows.length > 0) {
      this.log.log(`Restored ${rows.length} agent conversations from durable store`);
    }
  }

  private persist(conversation: Conversation): void {
    this.snapshots.put(KIND, conversation.id, conversation, conversation.userId);
  }

  createConversation(
    userId: string,
    agentType: 'sales_copilot' | 'support_agent',
    sessionId: string | null = null,
  ): Conversation {
    const conversation: Conversation = {
      id: `conv_${randomUUID().slice(0, 8)}`,
      userId,
      sessionId,
      agentType,
      messages: [],
      tokenCount: 0,
      totalCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(conversation.id, conversation);
    this.persist(conversation);
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
    this.persist(conversation);
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
    this.persist(conversation);
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
    this.persist(conversation);
  }

  getMessages(conversationId: string): ConversationMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);
    return conversation.messages;
  }

  /** All conversations for a user, newest first. */
  listForUser(userId: string): Conversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => c.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
}
