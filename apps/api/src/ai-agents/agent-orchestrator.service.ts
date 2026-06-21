import { Injectable, Logger } from '@nestjs/common';

import type { AgentTurnResult, LLMProvider, ToolContext } from './types';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import { AgentRateLimiter } from './rate-limiter/agent-rate-limiter.service';
import { SALES_COPILOT_SYSTEM_PROMPT } from './system-prompts/sales-copilot.prompt';
import { SUPPORT_AGENT_SYSTEM_PROMPT } from './system-prompts/support-agent.prompt';

/**
 * Orchestrates multi-turn agent conversations.
 * Manages the agentic loop: LLM response → tool execution → next turn.
 *
 * Enforces per-user daily limits via {@link AgentRateLimiter} before each turn
 * and records token/cost usage after the LLM responds.
 */
@Injectable()
export class AgentOrchestrator {
  private readonly log = new Logger(AgentOrchestrator.name);

  constructor(
    private readonly conversationManager: ConversationManager,
    private readonly toolExecutor: ToolExecutor,
    private readonly rateLimiter: AgentRateLimiter,
  ) {}

  async processTurn(
    conversationId: string,
    userMessage: string,
    llmProvider: LLMProvider,
    maxToolCalls: number = 10,
    replyToId?: string,
  ): Promise<AgentTurnResult> {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Enforce daily limits before spending any tokens. Throws
    // RateLimitExceededError when a hard cap is already reached.
    this.rateLimiter.assertWithinLimits(conversation.userId);

    // Add user message to history
    this.conversationManager.addUserMessage(conversationId, userMessage, replyToId);

    // Get system prompt based on agent type
    const systemPrompt = this.getSystemPrompt(conversation.agentType);

    // Get all messages for context
    const messages = this.conversationManager.getMessages(conversationId);

    // Call LLM
    const toolDefs = this.toolExecutor.getDefinitions();
    const llmResponse = await llmProvider.generateResponse(messages, toolDefs, systemPrompt);

    // Record usage for this turn (tokens + cost) and persist the running total.
    this.rateLimiter.recordUsage(conversation.userId, llmResponse.tokenCount, llmResponse.cost);

    // Add assistant message (with tool calls if any)
    const assistantMsg = this.conversationManager.addAssistantMessage(
      conversationId,
      llmResponse.content,
      llmResponse.toolCalls,
      llmResponse.tokenCount,
      llmResponse.cost,
    );

    let toolResults;
    let toolCallCount = 0;

    // Execute tool calls if any
    if (llmResponse.toolCalls.length > 0) {
      toolCallCount = llmResponse.toolCalls.length;
      if (toolCallCount > maxToolCalls) {
        this.log.warn(
          `Tool call limit exceeded: ${toolCallCount} > ${maxToolCalls} for conversation ${conversationId}`,
        );
        toolResults = [
          {
            toolCallId: '',
            name: '',
            result: null,
            error: `Tool call limit exceeded (max ${maxToolCalls})`,
          },
        ];
      } else {
        const context: ToolContext = {
          userId: conversation.userId,
          sessionId: conversation.sessionId,
          conversationId: conversation.id,
          agentType: conversation.agentType,
        };
        toolResults = await this.toolExecutor.executeToolCalls(llmResponse.toolCalls, context);
        this.conversationManager.addToolResults(conversationId, toolResults);
      }
    }

    // Determine if we should continue (more tool calls or end conversation)
    // Continue if: there are successful tool results and we haven't hit the limit
    const shouldContinue =
      toolCallCount > 0 && toolCallCount < maxToolCalls && !toolResults?.some((r) => r.error);

    // Update search index and generate title on first message
    this.conversationManager.updateSearchIndex(conversationId);
    const conv = this.conversationManager.getConversation(conversationId);
    if (conv && !conv.title && conv.messages.length > 0) {
      conv.title = this.conversationManager.generateTitle(conversationId);
      (this.conversationManager as any)['persist'](conv);
    }

    return {
      message: assistantMsg,
      toolResults,
      shouldContinue,
    };
  }

  private getSystemPrompt(agentType: 'sales_copilot' | 'support_agent'): string {
    switch (agentType) {
      case 'sales_copilot':
        return SALES_COPILOT_SYSTEM_PROMPT;
      case 'support_agent':
        return SUPPORT_AGENT_SYSTEM_PROMPT;
      default:
        return '';
    }
  }
}
