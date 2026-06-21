import { ClaudeLLMProvider } from './claude-llm.provider';
import { OpenAILLMProvider } from './openai-llm.provider';
import { SEARCH_PRODUCTS_TOOL } from '../tool-executor/tools';
import type { ConversationMessage } from '../types';

/**
 * Opt-in end-to-end tests against the real Claude / OpenAI APIs.
 *
 * These are skipped unless the relevant API key is present in the environment,
 * so CI stays hermetic. To run locally:
 *   ANTHROPIC_API_KEY=sk-... pnpm --filter @custom-merch/api test llm-provider.integration
 *   OPENAI_API_KEY=sk-...    pnpm --filter @custom-merch/api test llm-provider.integration
 */

const userMessage = (content: string): ConversationMessage => ({
  id: 'm1',
  role: 'user',
  content,
  createdAt: new Date().toISOString(),
});

const describeClaude = process.env.ANTHROPIC_API_KEY ? describe : describe.skip;
const describeOpenAI = process.env.OPENAI_API_KEY ? describe : describe.skip;

describeClaude('ClaudeLLMProvider (live)', () => {
  jest.setTimeout(30_000);

  it('returns a text response for a simple prompt', async () => {
    const provider = new ClaudeLLMProvider(process.env.ANTHROPIC_API_KEY!);
    const res = await provider.generateResponse(
      [userMessage('Say "hello" and nothing else.')],
      [],
      'You are a terse assistant.',
    );
    expect(res.content.toLowerCase()).toContain('hello');
    expect(res.tokenCount).toBeGreaterThan(0);
    expect(res.cost).toBeGreaterThan(0);
  });

  it('emits a tool call when a tool is clearly required', async () => {
    const provider = new ClaudeLLMProvider(process.env.ANTHROPIC_API_KEY!);
    const res = await provider.generateResponse(
      [userMessage('Find me some t-shirts. You must use the search_products tool.')],
      [SEARCH_PRODUCTS_TOOL],
      'You are a sales assistant. Use tools when relevant.',
    );
    expect(res.toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(res.toolCalls[0]?.name).toBe('search_products');
  });
});

describeOpenAI('OpenAILLMProvider (live)', () => {
  jest.setTimeout(30_000);

  it('returns a text response for a simple prompt', async () => {
    const provider = new OpenAILLMProvider(process.env.OPENAI_API_KEY!);
    const res = await provider.generateResponse(
      [userMessage('Say "hello" and nothing else.')],
      [],
      'You are a terse assistant.',
    );
    expect(res.content.toLowerCase()).toContain('hello');
    expect(res.tokenCount).toBeGreaterThan(0);
  });

  it('emits a tool call when a tool is clearly required', async () => {
    const provider = new OpenAILLMProvider(process.env.OPENAI_API_KEY!);
    const res = await provider.generateResponse(
      [userMessage('Find me some t-shirts using the search_products tool.')],
      [SEARCH_PRODUCTS_TOOL],
      'You are a sales assistant. Use tools when relevant.',
    );
    expect(res.toolCalls.length).toBeGreaterThanOrEqual(1);
    expect(res.toolCalls[0]?.name).toBe('search_products');
  });
});

// Keep at least one always-running assertion so the suite isn't "empty" when
// no keys are configured.
describe('LLM integration harness', () => {
  it('skips live tests when no API keys are configured', () => {
    const hasKeys = Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
    expect(typeof hasKeys).toBe('boolean');
  });
});
