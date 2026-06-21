import { Body, Controller, Get, Inject, Logger, Param, Post } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

import { AgentOrchestrator } from './agent-orchestrator.service';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import type { LLMProvider } from './llm-provider/llm-provider.interface';
import type {
  CreateConversationRequest,
  GetConversationResponse,
  SendMessageRequest,
  SendMessageResponse,
} from './ai-agents.dto';

@Controller('api/ai-agents')
export class AiAgentsController {
  private readonly log = new Logger(AiAgentsController.name);

  constructor(
    private readonly conversationManager: ConversationManager,
    private readonly orchestrator: AgentOrchestrator,
    @Inject('LLM_PROVIDER') private readonly llmProvider: LLMProvider,
  ) {}

  @Post('/conversations')
  createConversation(
    @Body() body: CreateConversationRequest,
  ): GetConversationResponse {
    const userId = `guest_${Date.now()}`;
    const conversation = this.conversationManager.createConversation(
      userId,
      body.agentType,
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

    const result = await this.orchestrator.processTurn(
      conversationId,
      body.message,
      this.llmProvider,
    );

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
