import { Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

import type { ConversationMessage, LLMResponse, ToolDefinition } from '../types';
import { BaseLLMProvider } from './llm-provider.interface';

export class ClaudeLLMProvider extends BaseLLMProvider {
  readonly name = 'claude';
  private readonly log = new Logger(ClaudeLLMProvider.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    super();
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateResponse(
    messages: ConversationMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): Promise<LLMResponse> {
    const claudeMessages: MessageParam[] = messages
      .filter((m) => m.role !== 'system')
      .map((msg) => this.buildMessageParam(msg));

    const toolDefs = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: claudeMessages,
      ...(toolDefs.length > 0 && { tools: toolDefs }),
    });

    const textContent = response.content.find((block) => block.type === 'text');
    const toolUseBlocks = response.content.filter((block) => block.type === 'tool_use');

    const toolCalls = toolUseBlocks.map((block: any) => ({
      id: block.id,
      name: block.name,
      arguments: block.input,
    }));

    const content = textContent && textContent.type === 'text' ? textContent.text : '';
    const tokenCount = response.usage.input_tokens + response.usage.output_tokens;
    const cost = this.estimateCost(tokenCount);

    return {
      content,
      toolCalls,
      tokenCount,
      cost,
    };
  }

  private buildMessageParam(msg: ConversationMessage): MessageParam {
    if (msg.role === 'assistant') {
      const content: (
        | Anthropic.TextBlockParam
        | Anthropic.ToolUseBlockParam
        | Anthropic.ToolResultBlockParam
      )[] = [];

      if (msg.content) {
        content.push({ type: 'text', text: msg.content });
      }

      if (msg.toolCalls) {
        for (const call of msg.toolCalls) {
          content.push({
            type: 'tool_use' as const,
            id: call.id,
            name: call.name,
            input: call.arguments,
          });
        }
      }

      if (msg.toolResults) {
        for (const result of msg.toolResults) {
          content.push({
            type: 'tool_result' as const,
            tool_use_id: result.toolCallId,
            content: result.error ? `Error: ${result.error}` : JSON.stringify(result.result),
          });
        }
      }

      return {
        role: 'assistant',
        content,
      };
    }

    return {
      role: msg.role as 'user',
      content: msg.content,
    };
  }
}
