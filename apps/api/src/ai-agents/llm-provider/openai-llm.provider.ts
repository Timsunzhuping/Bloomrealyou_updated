import { Logger } from '@nestjs/common';
import OpenAI from 'openai';

import type { ConversationMessage, LLMResponse, ToolDefinition } from '../types';
import { BaseLLMProvider } from './llm-provider.interface';

export class OpenAILLMProvider extends BaseLLMProvider {
  readonly name = 'openai';
  private readonly log = new Logger(OpenAILLMProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    super();
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateResponse(
    messages: ConversationMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): Promise<LLMResponse> {
    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages
        .filter((m) => m.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
    ];

    const toolDefs = tools.length > 0
      ? tools.map((tool) => ({
          type: 'function' as const,
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }))
      : undefined;

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      ...(toolDefs && { tools: toolDefs }),
    });

    const firstChoice = response.choices[0];
    const toolCalls = firstChoice?.message?.tool_calls
      ? firstChoice.message.tool_calls.map((call: any) => {
          const funcCall = call.function;
          return {
            id: call.id,
            name: funcCall.name,
            arguments: JSON.parse(funcCall.arguments),
          };
        })
      : [];

    const content = firstChoice?.message?.content ?? '';
    const tokenCount = (response.usage?.prompt_tokens ?? 0) + (response.usage?.completion_tokens ?? 0);
    const cost = this.estimateCost(tokenCount);

    return {
      content,
      toolCalls,
      tokenCount,
      cost,
    };
  }
}
