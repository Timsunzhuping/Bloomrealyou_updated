import type { ConversationMessage, LLMResponse, ToolDefinition } from '../types';
import { BaseLLMProvider } from './llm-provider.interface';

export class MockLLMProvider extends BaseLLMProvider {
  readonly name = 'mock';

  async generateResponse(
    _messages: ConversationMessage[],
    _tools: ToolDefinition[],
    _systemPrompt: string,
  ): Promise<LLMResponse> {
    const content = 'Mock response from LLM provider.';
    const tokenCount = this.countTokens(content);
    const cost = this.estimateCost(tokenCount);

    return {
      content,
      toolCalls: [],
      tokenCount,
      cost,
    };
  }
}
