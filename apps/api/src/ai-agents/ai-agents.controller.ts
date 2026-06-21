import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Post,
} from '@nestjs/common';

import { AgentOrchestrator } from './agent-orchestrator.service';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { AgentRateLimiter, RateLimitExceededError } from './rate-limiter/agent-rate-limiter.service';
import type { LLMProvider } from './llm-provider/llm-provider.interface';
import type {
  CreateConversationRequest,
  GetConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './ai-agents.dto';

const SESSION_HEADER = 'x-cart-session';

@Controller('api/ai-agents')
export class AiAgentsController {
  private readonly log = new Logger(AiAgentsController.name);

  constructor(
    private readonly conversationManager: ConversationManager,
    private readonly orchestrator: AgentOrchestrator,
    private readonly rateLimiter: AgentRateLimiter,
    @Inject('LLM_PROVIDER') private readonly llmProvider: LLMProvider,
  ) {}

  @Post('/conversations')
  createConversation(
    @Body() body: CreateConversationRequest,
    @Headers(SESSION_HEADER) session: string | undefined,
  ): GetConversationResponse {
    // The cart/checkout session (when present) is both the user id and the
    // session tools act on, so an agent can place orders against the user's
    // own cart. Anonymous chats get a throwaway guest id.
    const sessionId = session?.trim() || null;
    const userId = sessionId ?? `guest_${Date.now()}`;
    const conversation = this.conversationManager.createConversation(
      userId,
      body.agentType,
      sessionId,
    );
    return { conversation: this.toDto(conversation) };
  }

  @Get('/conversations/:conversationId')
  getConversation(
    @Param('conversationId') conversationId: string,
  ): GetConversationResponse {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    return { conversation: this.toDto(conversation) };
  }

  @Post('/conversations/:conversationId/messages')
  async sendMessage(
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageRequest,
  ): Promise<SendMessageResponse> {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }

    let result;
    try {
      result = await this.orchestrator.processTurn(
        conversationId,
        body.message,
        this.llmProvider,
      );
    } catch (err) {
      if (err instanceof RateLimitExceededError) {
        throw new HttpException(
          { code: 'AI_AGENT_RATE_LIMITED', reason: err.reason, message: err.message },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw err;
    }

    const updatedConversation = this.conversationManager.getConversation(conversationId);
    if (!updatedConversation) {
      throw new BadRequestException('Conversation lost after processing');
    }

    return {
      conversation: this.toDto(updatedConversation),
      lastMessage: this.messageToDto(result.message),
      shouldContinue: result.shouldContinue,
    };
  }

  private toDto(conversation: any) {
    return {
      id: conversation.id,
      agentType: conversation.agentType,
      messages: conversation.messages.map((m: any) => this.messageToDto(m)),
      tokenCount: conversation.tokenCount,
      totalCost: conversation.totalCost,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }

  private messageToDto(message: any) {
    return {
      id: message.id,
      role: message.role,
      content: message.content,
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      createdAt: message.createdAt,
    };
  }
}
