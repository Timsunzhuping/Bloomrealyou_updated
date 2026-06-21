import type { ConversationMessage, LLMProvider, LLMResponse, ToolDefinition } from '../types';

export { type LLMProvider, type LLMResponse };

const CLAUDE_TOKENS_PER_1K = 3;
const CLAUDE_COST_PER_1K_INPUT = 0.003;
const CLAUDE_COST_PER_1K_OUTPUT = 0.015;

/**
 * Base LLM provider with shared token counting and cost estimation.
 * Subclasses implement generateResponse.
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract generateResponse(
    messages: ConversationMessage[],
    tools: ToolDefinition[],
    systemPrompt: string,
  ): Promise<LLMResponse>;

  countTokens(text: string): number {
    // Rough estimation: ~1.3 characters per token for English text
    return Math.ceil(text.length / 1.3);
  }

  estimateCost(tokenCount: number): number {
    // Average mix of input/output tokens: ~70% input, ~30% output
    const inputTokens = Math.ceil(tokenCount * 0.7);
    const outputTokens = Math.ceil(tokenCount * 0.3);
    const inputCost = (inputTokens / 1000) * CLAUDE_COST_PER_1K_INPUT;
    const outputCost = (outputTokens / 1000) * CLAUDE_COST_PER_1K_OUTPUT;
    return inputCost + outputCost;
  }
}
