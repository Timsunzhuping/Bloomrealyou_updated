import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Param,
  Patch,
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
  listConversations(): any {
    const conversations = this.conversationManager.listAll();
    return { conversations: conversations.map((c) => this.toDto(c)) };
  }

  @Get('/conversations/search')
  searchConversations(
    @Headers() headers: Record<string, string>,
  ): any {
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

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    const filename = `conversation-${conversation.id}-${Date.now()}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Conversation Transcript', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(
      `ID: ${conversation.id} | Agent: ${conversation.agentType}`,
      { align: 'center' },
    );
    doc.text(
      `Created: ${new Date(conversation.createdAt).toLocaleString()} | ` +
        `Tokens: ${conversation.tokenCount} | Cost: $${conversation.totalCost.toFixed(4)}`,
      { align: 'center' },
    );
    doc.moveDown(1);

    // Messages
    for (const msg of conversation.messages) {
      const isUser = msg.role === 'user';
      const bgColor = isUser ? '#dbeafe' : '#f3f4f6';

      doc.rect(doc.x, doc.y, doc.width - 100, 1).fill('#cccccc');
      doc.moveDown(0.3);

      doc.fontSize(11).font('Helvetica-Bold').text(`${msg.role.toUpperCase()}`);
      doc.fontSize(10).font('Helvetica').text(msg.content, { wrap: true });

      if (msg.toolCalls?.length) {
        doc.fontSize(9).font('Helvetica-Oblique').text(
          `🔧 Tools: ${msg.toolCalls.map((t) => t.name).join(', ')}`,
        );
      }

      doc.fontSize(8).font('Helvetica').fillColor('#666666').text(
        new Date(msg.createdAt).toLocaleString(),
      );
      doc.fillColor('#000000');
      doc.moveDown(0.5);
    }

    doc.end();
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
      // Process turn with streaming (processTurn adds the user message internally)
      let result;
      try {
        result = await this.orchestrator.processTurn(
          conversationId,
          body.message,
          this.llmProvider,
          10,
          (body as any).replyToId,
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
        10,
        (body as any).replyToId,
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
      title: conversation.title,
      isBookmarked: conversation.isBookmarked,
      shareToken: conversation.shareToken,
      shareType: conversation.shareType,
      tags: conversation.tags,
      summary: conversation.summary,
      permissions: conversation.permissions,
      mergedFrom: conversation.mergedFrom,
      insights: conversation.insights,
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
      replyToId: message.replyToId,
    };
  }

  @Patch('/conversations/:conversationId/bookmark')
  toggleBookmark(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    conversation.isBookmarked = body.isBookmarked ?? !conversation.isBookmarked;
    (this.conversationManager as any)['persist'](conversation);
    return { conversation: this.toDto(conversation) };
  }

  @Get('/conversations/:conversationId/share-token')
  createShareToken(
    @Param('conversationId') conversationId: string,
    @Headers('x-share-type') shareType: 'public' | 'link' = 'link',
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    const shareToken = `share_${conversationId}_${Date.now()}`;
    conversation.shareToken = shareToken;
    conversation.shareType = shareType;
    (this.conversationManager as any)['persist'](conversation);
    return {
      shareToken,
      shareUrl: `${process.env.APP_URL}/ai-chat?share=${shareToken}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  @Get('/analytics')
  getAnalytics(
    @Headers('x-start-date') startDate?: string,
    @Headers('x-end-date') endDate?: string,
  ): any {
    const allConversations = (this.conversationManager as any)['listAll']();
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const filtered = allConversations.filter(
      (c: any) =>
        new Date(c.createdAt) >= start && new Date(c.createdAt) <= end,
    );

    const totalTokens = filtered.reduce((sum: number, c: any) => sum + c.tokenCount, 0);
    const totalCost = filtered.reduce((sum: number, c: any) => sum + c.totalCost, 0);
    const messageCounts = filtered.map((c: any) => c.messages.length);

    const analytics = {
      totalConversations: filtered.length,
      averageTokensPerConversation: filtered.length > 0 ? totalTokens / filtered.length : 0,
      averageCostPerConversation: filtered.length > 0 ? totalCost / filtered.length : 0,
      totalTokensUsed: totalTokens,
      totalCostIncurred: totalCost,
      conversationsByAgent: {
        sales_copilot: filtered.filter((c: any) => c.agentType === 'sales_copilot').length,
        support_agent: filtered.filter((c: any) => c.agentType === 'support_agent').length,
      },
      bookmarkedConversations: filtered.filter((c: any) => c.isBookmarked).length,
      messageCountDistribution: {
        min: messageCounts.length > 0 ? Math.min(...messageCounts) : 0,
        max: messageCounts.length > 0 ? Math.max(...messageCounts) : 0,
        average: messageCounts.length > 0 ? messageCounts.reduce((a: number, b: number) => a + b, 0) / messageCounts.length : 0,
      },
    };

    return {
      analytics,
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
    };
  }

  @Get('/public-conversations')
  getPublicConversations(
    @Headers('x-page') page: string = '1',
    @Headers('x-page-size') pageSize: string = '20',
  ): any {
    const conversations = this.conversationManager.listPublic();
    const pageNum = parseInt(page) || 1;
    const size = parseInt(pageSize) || 20;
    const start = (pageNum - 1) * size;
    const paged = conversations.slice(start, start + size);

    return {
      conversations: paged.map((c) => this.toDto(c)),
      total: conversations.length,
      page: pageNum,
      pageSize: size,
    };
  }

  @Post('/conversations/:conversationId/tags')
  addTags(
    @Param('conversationId') conversationId: string,
    @Body() body: { tags: string[] },
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    this.conversationManager.addTags(conversationId, body.tags);
    const updated = this.conversationManager.getConversation(conversationId);
    return { conversation: this.toDto(updated) };
  }

  @Post('/conversations/:conversationId/tags/:tag/remove')
  removeTag(
    @Param('conversationId') conversationId: string,
    @Param('tag') tag: string,
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    this.conversationManager.removeTag(conversationId, decodeURIComponent(tag));
    const updated = this.conversationManager.getConversation(conversationId);
    return { conversation: this.toDto(updated) };
  }

  @Get('/conversations/:conversationId/summary')
  getSummary(
    @Param('conversationId') conversationId: string,
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    if (!conversation.summary) {
      const generated = this.conversationManager.generateSummary(conversationId);
      this.conversationManager.setSummary(conversationId, generated);
    }
    return { summary: conversation.summary };
  }

  @Post('/conversations/:conversationId/export/template')
  async exportWithTemplate(
    @Param('conversationId') conversationId: string,
    @Body() body: any,
    @Res() res: Response,
  ): Promise<void> {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      res.status(400).json({ error: `Conversation ${conversationId} not found` });
      return;
    }

    const format = body.format || 'markdown';

    if (format === 'html') {
      const html = this.generateHtmlExport(conversation);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="conversation.html"`);
      res.send(html);
    } else if (format === 'markdown') {
      const md = this.generateMarkdownExport(conversation);
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="conversation.md"`);
      res.send(md);
    } else {
      res.status(400).json({ error: 'Unsupported format' });
    }
  }

  @Post('/conversations/:conversationId/access')
  grantAccess(
    @Param('conversationId') conversationId: string,
    @Body() body: { userId: string; role: string },
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    this.conversationManager.grantAccess(conversationId, body.userId, body.role);
    const updated = this.conversationManager.getConversation(conversationId);
    return {
      permissions: updated?.permissions || [],
    };
  }

  @Delete('/conversations/:conversationId/access/:userId')
  revokeAccess(
    @Param('conversationId') conversationId: string,
    @Param('userId') userId: string,
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    this.conversationManager.revokeAccess(conversationId, userId);
    const updated = this.conversationManager.getConversation(conversationId);
    return {
      permissions: updated?.permissions || [],
    };
  }

  @Post('/conversations/merge')
  mergeConversations(
    @Body() body: { sourceConversationIds: string[]; targetConversationId: string },
  ): any {
    const merged = this.conversationManager.mergeConversations(
      body.sourceConversationIds,
      body.targetConversationId,
    );
    if (!merged) {
      throw new BadRequestException('Target conversation not found');
    }
    return {
      mergedConversation: this.toDto(merged),
      mergedCount: body.sourceConversationIds.length,
    };
  }

  @Get('/conversations/:conversationId/predictions')
  getPredictions(
    @Param('conversationId') conversationId: string,
  ): any {
    const conversation = this.conversationManager.getConversation(conversationId);
    if (!conversation) {
      throw new BadRequestException(`Conversation ${conversationId} not found`);
    }
    const insights = this.conversationManager.generateInsights(conversationId);
    return {
      predictions: {
        ...insights,
        recommendations: [
          insights.sentiment === 'positive' ? 'Conversation went well' : 'May need follow-up',
          insights.completionLikelihood > 0.7 ? 'Ready for export' : 'More interaction needed',
          `Topic: ${insights.topic}`,
        ],
      },
    };
  }

  @Post('/conversations/batch-export')
  async batchExport(
    @Body() body: { conversationIds: string[]; format: string },
    @Res() res: Response,
  ): Promise<void> {
    if (!body.conversationIds || body.conversationIds.length === 0) {
      res.status(400).json({ error: 'No conversation IDs provided' });
      return;
    }

    const conversations = body.conversationIds
      .map((id) => this.conversationManager.getConversation(id))
      .filter((c) => c !== undefined);

    if (body.format === 'json') {
      const filename = `conversations-${Date.now()}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(JSON.stringify(conversations.map((c) => this.toDto(c)), null, 2));
    } else {
      // ZIP format
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      conversations.forEach((conv) => {
        const lines = [
          `Conversation ${conv.id}`,
          `Agent: ${conv.agentType}`,
          `Created: ${conv.createdAt}`,
          `Tokens: ${conv.tokenCount} | Cost: $${conv.totalCost.toFixed(4)}`,
          '',
          '---',
          '',
        ];

        for (const msg of conv.messages) {
          lines.push(`${msg.role.toUpperCase()} [${msg.createdAt}]:`);
          lines.push(msg.content);
          if (msg.toolCalls?.length) {
            lines.push('Tools: ' + msg.toolCalls.map((t) => t.name).join(', '));
          }
          lines.push('');
        }

        zip.file(`${conv.id}.txt`, lines.join('\n'));
      });

      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const filename = `conversations-${Date.now()}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(zipBuffer);
    }
  }

  private generateHtmlExport(conversation: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(conversation.title || 'Conversation')}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .header { border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0 0 10px 0; color: #1f2937; }
    .meta { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px; font-size: 14px; color: #666; }
    .message { margin-bottom: 20px; padding: 15px; border-radius: 6px; border-left: 4px solid #ccc; }
    .user { background: #dbeafe; border-left-color: #3b82f6; }
    .assistant { background: #f3f4f6; border-left-color: #6b7280; }
    .role { font-weight: bold; font-size: 13px; color: #1f2937; margin-bottom: 8px; }
    .content { color: #374151; white-space: pre-wrap; word-break: break-word; }
    .timestamp { font-size: 12px; color: #999; margin-top: 8px; }
    .tools { font-size: 12px; color: #7c3aed; margin-top: 8px; font-style: italic; }
    .tags { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .tag { display: inline-block; background: #e0e7ff; color: #4f46e5; padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-right: 8px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.escapeHtml(conversation.title || 'Conversation')}</h1>
      <div class="meta">
        <div><strong>Agent:</strong> ${conversation.agentType}</div>
        <div><strong>Date:</strong> ${new Date(conversation.createdAt).toLocaleString()}</div>
        <div><strong>Tokens:</strong> ${conversation.tokenCount}</div>
        <div><strong>Cost:</strong> $${conversation.totalCost.toFixed(4)}</div>
      </div>
    </div>
    ${conversation.summary ? `<p><strong>Summary:</strong> ${this.escapeHtml(conversation.summary)}</p>` : ''}
    <div class="messages">
      ${conversation.messages
        .map(
          (msg: any) => `
        <div class="message ${msg.role}">
          <div class="role">${msg.role.toUpperCase()}</div>
          <div class="content">${this.escapeHtml(msg.content)}</div>
          ${msg.toolCalls ? `<div class="tools">🔧 Tools: ${msg.toolCalls.map((t: any) => t.name).join(', ')}</div>` : ''}
          <div class="timestamp">${new Date(msg.createdAt).toLocaleString()}</div>
        </div>
      `,
        )
        .join('')}
    </div>
    ${conversation.tags && conversation.tags.length > 0 ? `<div class="tags">${conversation.tags.map((tag: string) => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
  </div>
</body>
</html>
    `;
  }

  private generateMarkdownExport(conversation: any): string {
    const lines = [
      `# ${conversation.title || 'Conversation'}`,
      '',
      `**Agent:** ${conversation.agentType}  `,
      `**Created:** ${new Date(conversation.createdAt).toLocaleString()}  `,
      `**Tokens:** ${conversation.tokenCount} | **Cost:** $${conversation.totalCost.toFixed(4)}  `,
      '',
    ];

    if (conversation.summary) {
      lines.push(`## Summary`);
      lines.push(`${conversation.summary}`);
      lines.push('');
    }

    lines.push('## Conversation');
    lines.push('');

    for (const msg of conversation.messages) {
      lines.push(`### ${msg.role.charAt(0).toUpperCase() + msg.role.slice(1)}`);
      lines.push(`*${new Date(msg.createdAt).toLocaleString()}*`);
      lines.push('');
      lines.push(msg.content);
      lines.push('');
      if (msg.toolCalls?.length) {
        lines.push(`**Tools used:** ${msg.toolCalls.map((t: any) => `\`${t.name}\``).join(', ')}`);
        lines.push('');
      }
    }

    if (conversation.tags && conversation.tags.length > 0) {
      lines.push('## Tags');
      lines.push(conversation.tags.map((tag: string) => `- ${tag}`).join('\n'));
    }

    return lines.join('\n');
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m] || m);
  }
}
