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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';

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

  @Get('/conversations')
  listConversations(): { conversations: ReturnType<typeof this.toDto>[] } {
    const conversations = this.conversationManager.listAll();
    return { conversations: conversations.map((c) => this.toDto(c)) };
  }

  @Get('/conversations/search')
  searchConversations(
    @Headers() headers: Record<string, string>,
  ): { conversations: ReturnType<typeof this.toDto>[] } {
    const query = (headers['x-search-query'] || '').toLowerCase();
    const agentType = headers['x-agent-type'] as any;
    const startDate = headers['x-start-date'] ? new Date(headers['x-start-date']) : null;
    const endDate = headers['x-end-date'] ? new Date(headers['x-end-date']) : null;

    let conversations = this.conversationManager.listAll();

    // Filter by agent type
    if (agentType) {
      conversations = conversations.filter((c) => c.agentType === agentType);
    }

    // Filter by date range
    if (startDate) {
      conversations = conversations.filter(
        (c) => new Date(c.createdAt) >= startDate,
      );
    }
    if (endDate) {
      conversations = conversations.filter(
        (c) => new Date(c.createdAt) <= endDate,
      );
    }

    // Filter by keywords in messages
    if (query) {
      conversations = conversations.filter((c) =>
        c.messages.some((m) => m.content.toLowerCase().includes(query)),
      );
    }

    return { conversations: conversations.map((c) => this.toDto(c)) };
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

  @Get('/conversations/:conversationId/export')
  exportConversation(
    @Param('conversationId') conversationId: string,
    @Res() res: Response,
  ): void {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      res.status(400).json({ error: `Conversation ${conversationId} not found` });
      return;
    }

    // Format as plain text transcript
    const lines = [
      `Conversation ${conversation.id}`,
      `Agent: ${conversation.agentType}`,
      `Started: ${conversation.createdAt}`,
      `Tokens: ${conversation.tokenCount} | Cost: $${conversation.totalCost.toFixed(4)}`,
      '',
      '---',
      '',
    ];

    for (const msg of conversation.messages) {
      lines.push(`${msg.role.toUpperCase()} [${msg.createdAt}]:`);
      lines.push(msg.content);
      if (msg.toolCalls?.length) {
        lines.push('Tools used: ' + msg.toolCalls.map((t) => t.name).join(', '));
      }
      lines.push('');
    }

    const text = lines.join('\n');
    const filename = `conversation-${conversation.id}-${Date.now()}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(text);
  }

  @Get('/conversations/:conversationId/export/pdf')
  exportConversationPdf(
    @Param('conversationId') conversationId: string,
    @Res() res: Response,
  ): void {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      res.status(400).json({ error: `Conversation ${conversationId} not found` });
      return;
    }

    // Generate HTML for PDF
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conversation ${conversation.id}</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(to right, #3b82f6, #1e40af); color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; }
    .meta { font-size: 14px; opacity: 0.9; }
    .message { margin-bottom: 20px; padding: 15px; border-radius: 8px; }
    .user { background: #dbeafe; border-left: 4px solid #3b82f6; }
    .assistant { background: #f3f4f6; border-left: 4px solid #6b7280; }
    .role { font-weight: bold; font-size: 14px; color: #1f2937; margin-bottom: 8px; }
    .timestamp { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .tools { font-size: 12px; color: #7c3aed; margin-top: 8px; font-style: italic; }
    .content { white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Conversation Transcript</h1>
    <div class="meta">
      <p>ID: ${conversation.id}<br/>
      Agent: ${conversation.agentType}<br/>
      Created: ${new Date(conversation.createdAt).toLocaleString()}<br/>
      Tokens: ${conversation.tokenCount} | Cost: $${conversation.totalCost.toFixed(4)}</p>
    </div>
  </div>
  ${conversation.messages
    .map(
      (msg) => `
    <div class="message ${msg.role}">
      <div class="role">${msg.role.toUpperCase()}</div>
      <div class="content">${this.escapeHtml(msg.content)}</div>
      ${msg.toolCalls ? `<div class="tools">🔧 Tools: ${msg.toolCalls.map((t) => t.name).join(', ')}</div>` : ''}
      <div class="timestamp">${new Date(msg.createdAt).toLocaleString()}</div>
    </div>
  `,
    )
    .join('')}
</body>
</html>
    `;

    const filename = `conversation-${conversation.id}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // For now, return HTML as PDF (can be upgraded to actual PDF library)
    res.send(html);
  }

  @Post('/conversations/:conversationId/messages/stream')
  async sendMessageStream(
    @Param('conversationId') conversationId: string,
    @Body() body: SendMessageRequest,
    @Res() res: Response,
  ): Promise<void> {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      res.status(400).json({ error: `Conversation ${conversationId} not found` });
      return;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const sendEvent = (data: Record<string, unknown>) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // Add user message
      const userMessage = this.conversationManager.addUserMessage(conversationId, body.message);
      sendEvent({ type: 'user_message', message: this.messageToDto(userMessage) });

      // Process turn with streaming
      let result;
      try {
        result = await this.orchestrator.processTurn(
          conversationId,
          body.message,
          this.llmProvider,
        );
      } catch (err) {
        if (err instanceof RateLimitExceededError) {
          sendEvent({
            type: 'error',
            code: 'RATE_LIMITED',
            message: err.message,
          });
          res.end();
          return;
        }
        throw err;
      }

      // Send assistant message
      sendEvent({
        type: 'assistant_message',
        message: this.messageToDto(result.message),
      });

      // Send final state
      const updatedConversation = this.conversationManager.getConversation(conversationId);
      if (updatedConversation) {
        sendEvent({
          type: 'complete',
          conversation: this.toDto(updatedConversation),
        });
      }

      res.end();
    } catch (err) {
      this.log.error('Stream error:', err);
      sendEvent({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
      });
      res.end();
    }
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

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
