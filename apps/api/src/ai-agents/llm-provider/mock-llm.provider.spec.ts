import { MockLLMProvider } from './mock-llm.provider';
import { SEARCH_PRODUCTS_TOOL } from '../tool-executor/tools';

describe('MockLLMProvider', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  it('should return mock response', async () => {
    const response = await provider.generateResponse(
      [
        {
          id: 'msg_1',
          role: 'user',
          content: 'Find me a product',
          createdAt: new Date().toISOString(),
        },
      ],
      [SEARCH_PRODUCTS_TOOL],
      'You are an assistant',
    );

    expect(response.content).toBe('Mock response from LLM provider.');
    expect(response.toolCalls).toEqual([]);
    expect(response.tokenCount).toBeGreaterThan(0);
    expect(response.cost).toBeGreaterThan(0);
  });

  it('should have correct provider name', () => {
    expect(provider.name).toBe('mock');
  });

  it('should estimate tokens correctly', () => {
    const text = 'Hello world, this is a test.';
    const tokens = provider.countTokens(text);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(50);
  });

  it('should estimate cost correctly', () => {
    const cost = provider.estimateCost(1000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(10);
  });
});
