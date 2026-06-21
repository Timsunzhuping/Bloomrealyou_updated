import { Test, TestingModule } from '@nestjs/testing';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import { AgentRateLimiter } from './rate-limiter/agent-rate-limiter.service';
import { MockLLMProvider } from './llm-provider/mock-llm.provider';
import { SEARCH_PRODUCTS_TOOL } from './tool-executor/tools';
import { SnapshotStore } from '../_lib/snapshot-store';

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator;
  let conversationManager: ConversationManager;
  let toolExecutor: ToolExecutor;
  let llmProvider: MockLLMProvider;

  beforeEach(async () => {
    const snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentOrchestrator,
        ConversationManager,
        ToolExecutor,
        AgentRateLimiter,
        { provide: SnapshotStore, useValue: snapshots },
      ],
    }).compile();

    orchestrator = module.get(AgentOrchestrator);
    conversationManager = module.get(ConversationManager);
    toolExecutor = module.get(ToolExecutor);
    llmProvider = new MockLLMProvider();
  });

  it('should process a single turn conversation', async () => {
    const conv = conversationManager.createConversation('user123', 'sales_copilot');

    const result = await orchestrator.processTurn(
      conv.id,
      'I need a t-shirt',
      llmProvider,
    );

    expect(result.message.role).toBe('assistant');
    expect(result.message.content).toBeTruthy();
    expect(result.toolResults).toBeUndefined();
  });

  it('should add tool results when tools are called', async () => {
    const conv = conversationManager.createConversation('user123', 'sales_copilot');

    toolExecutor.registerTool(SEARCH_PRODUCTS_TOOL, async (input: any) => ({
      products: [{ id: 'prod_1', name: 'T-Shirt', price: 25 }],
    }));

    // Mock LLM that calls a tool
    const mockLLM = {
      name: 'mock',
      async generateResponse() {
        return {
          content: 'Found this product',
          toolCalls: [
            {
              id: 'call_1',
              name: 'search_products',
              arguments: { query: 'shirt' },
            },
          ],
          tokenCount: 50,
          cost: 0.01,
        };
      },
      countTokens: (text: string) => Math.ceil(text.length / 1.3),
      estimateCost: (tokens: number) => tokens * 0.00001,
    };

    const result = await orchestrator.processTurn(
      conv.id,
      'Find me a shirt',
      mockLLM as any,
    );

    expect(result.message.toolCalls).toHaveLength(1);
    expect(result.toolResults).toHaveLength(1);
    expect(result.toolResults?.[0]?.name).toBe('search_products');
  });

  it('should track conversation history across turns', async () => {
    const conv = conversationManager.createConversation('user123', 'sales_copilot');

    await orchestrator.processTurn(conv.id, 'First message', llmProvider);
    await orchestrator.processTurn(conv.id, 'Second message', llmProvider);

    const messages = conversationManager.getMessages(conv.id);
    expect(messages.length).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
  });

  it('should enforce max tool call limit', async () => {
    const conv = conversationManager.createConversation('user123', 'sales_copilot');

    const mockLLM = {
      name: 'mock',
      async generateResponse() {
        return {
          content: 'Calling tools',
          toolCalls: Array.from({ length: 11 }, (_, i) => ({
            id: `call_${i}`,
            name: 'search_products',
            arguments: { query: 'test' },
          })),
          tokenCount: 50,
          cost: 0.01,
        };
      },
      countTokens: (text: string) => Math.ceil(text.length / 1.3),
      estimateCost: (tokens: number) => tokens * 0.00001,
    };

    const result = await orchestrator.processTurn(
      conv.id,
      'Spam tools',
      mockLLM as any,
      10,
    );

    expect(result.shouldContinue).toBe(false);
    expect(result.toolResults).toBeDefined();
  });

  it('should use correct system prompt for agent type', async () => {
    const conv = conversationManager.createConversation('user123', 'support_agent');

    const mockLLM = {
      name: 'mock',
      async generateResponse(_messages: any, _tools: any, systemPrompt: string) {
        return {
          content: systemPrompt.includes('Support Agent') ? 'Support response' : 'Wrong prompt',
          toolCalls: [],
          tokenCount: 50,
          cost: 0.01,
        };
      },
      countTokens: (text: string) => Math.ceil(text.length / 1.3),
      estimateCost: (tokens: number) => tokens * 0.00001,
    };

    const result = await orchestrator.processTurn(
      conv.id,
      'I have an issue',
      mockLLM as any,
    );

    expect(result.message.content).toBe('Support response');
  });
});
