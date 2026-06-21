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

  addUserMessage(conversationId: string, content: string, replyToId?: string): ConversationMessage {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) throw new Error(`Conversation ${conversationId} not found`);

    const message: ConversationMessage = {
      id: randomUUID(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
      replyToId,
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

  /** All conversations, newest first (for development/admin). */
  listAll(): Conversation[] {
    return Array.from(this.conversations.values()).sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    );
  }

  /** Generate a short title from the first user message. */
  generateTitle(conversationId: string): string {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return 'Unknown';

    const firstUserMessage = conversation.messages.find((m) => m.role === 'user');
    if (!firstUserMessage) return 'Empty Conversation';

    const title = firstUserMessage.content.slice(0, 50).trim();
    return title.length >= 50 ? title + '...' : title;
  }

  /** Update search index for full-text search. */
  updateSearchIndex(conversationId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;

    const allText = conversation.messages
      .map((m) => m.content.toLowerCase())
      .join(' ');
    const words = allText
      .split(/\W+/)
      .filter((w) => w.length > 2)
      .filter((v, i, a) => a.indexOf(v) === i);

    conversation.searchIndex = words.join(',');
    this.persist(conversation);
  }

  /** Find conversations matching search query using index. */
  searchFull(query: string): Conversation[] {
    const queryTerms = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    return Array.from(this.conversations.values())
      .filter((c) => {
        const index = c.searchIndex || '';
        return queryTerms.some((term) => index.includes(term));
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Get all public conversations (Phase 5). */
  listPublic(): Conversation[] {
    return Array.from(this.conversations.values())
      .filter((c) => c.shareType === 'public')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /** Add tags to conversation (Phase 5). */
  addTags(conversationId: string, tags: string[]): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    conversation.tags = [...new Set([...(conversation.tags || []), ...tags])];
    this.persist(conversation);
  }

  /** Remove tag from conversation (Phase 5). */
  removeTag(conversationId: string, tag: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    conversation.tags = (conversation.tags || []).filter((t) => t !== tag);
    this.persist(conversation);
  }

  /** Generate summary for conversation (Phase 5). */
  generateSummary(conversationId: string): string {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || conversation.messages.length === 0) return '';

    // Simple summarization: Extract key points from messages
    const userMessages = conversation.messages.filter((m) => m.role === 'user');
    const points = userMessages.slice(0, 3).map((m) => m.content.slice(0, 100));
    return `Conversation about: ${points.join('. ')}`;
  }

  /** Set summary on conversation (Phase 5). */
  setSummary(conversationId: string, summary: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    conversation.summary = summary;
    this.persist(conversation);
  }

  /** Grant access to user (Phase 5). */
  grantAccess(conversationId: string, userId: string, role: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    conversation.permissions = conversation.permissions || [];
    conversation.permissions = conversation.permissions.filter((p) => p.userId !== userId);
    conversation.permissions.push({
      userId,
      role: role as any,
      grantedAt: new Date().toISOString(),
    });
    this.persist(conversation);
  }

  /** Revoke access from user (Phase 5). */
  revokeAccess(conversationId: string, userId: string): void {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return;
    conversation.permissions = (conversation.permissions || []).filter((p) => p.userId !== userId);
    this.persist(conversation);
  }

  /** Merge conversations (Phase 5). */
  mergeConversations(sourceIds: string[], targetId: string): Conversation | null {
    const target = this.conversations.get(targetId);
    if (!target) return null;

    // Add all messages from source conversations to target
    const sourceConversations = sourceIds.map((id) => this.conversations.get(id)).filter(Boolean) as Conversation[];
    for (const source of sourceConversations) {
      target.messages.push(...source.messages);
      target.mergedFrom = [...new Set([...(target.mergedFrom || []), source.id])];
    }

    // Update timestamps and persist
    target.updatedAt = new Date().toISOString();
    target.tokenCount = target.messages.length * 100; // Estimate
    this.persist(target);

    return target;
  }

  /** Generate insights for conversation (Phase 5). */
  generateInsights(conversationId: string): any {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return null;

    const messages = conversation.messages;
    const userMessages = messages.filter((m) => m.role === 'user');
    const assistantMessages = messages.filter((m) => m.role === 'assistant');

    // Simple sentiment analysis based on message length patterns
    const avgUserLength = userMessages.reduce((sum, m) => sum + m.content.length, 0) / (userMessages.length || 1);
    const sentiment = avgUserLength > 100 ? 'positive' : avgUserLength < 30 ? 'negative' : 'neutral';

    // Topic extraction from first message
    const firstMessage = userMessages[0]?.content || '';
    const topic = firstMessage.split(' ').slice(0, 3).join(' ');

    // Completion likelihood based on message count
    const completionLikelihood = Math.min(messages.length / 10, 1);

    return {
      sentiment,
      topic,
      completionLikelihood,
      nextActionSuggested: completionLikelihood > 0.7 ? 'Review and export' : 'Continue conversation',
      generatedAt: new Date().toISOString(),
    };
  }
}
