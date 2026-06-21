import { Test, TestingModule } from '@nestjs/testing';

import { SnapshotStore } from '../_lib/snapshot-store';
import { AdminProductsRepository } from '../admin-products/admin-products.repository';
import { OrdersRepository } from '../orders/orders.repository';
import { OrdersService } from '../orders/orders.service';
import { AccountRepository } from '../account/account.repository';
import { AIService } from '../ai/ai.service';
import { AgentOrchestrator } from './agent-orchestrator.service';
import { ConversationManager } from './conversation-manager/conversation-manager.service';
import { AgentRateLimiter, RateLimitExceededError } from './rate-limiter/agent-rate-limiter.service';
import { ToolExecutor } from './tool-executor/tool-executor.service';
import { AgentToolsRegistrar } from './tool-executor/agent-tools.registrar';
import type { LLMProvider, LLMResponse } from './types';

/**
 * End-to-end agent flow with a scripted LLM: exercises the orchestrator, the
 * rate limiter, durable conversation persistence and the production tools
 * together — the path a customer would drive when chatting their way to an
 * order.
 */

/** A mock LLM that replays a queue of scripted responses. */
class ScriptedLLM implements LLMProvider {
  name = 'scripted';
  private queue: LLMResponse[] = [];
  countTokens = (t: string) => Math.ceil(t.length / 1.3);
  estimateCost = (tokens: number) => tokens * 0.00001;

  enqueue(res: Partial<LLMResponse>): void {
    this.queue.push({ content: '', toolCalls: [], tokenCount: 100, cost: 0.001, ...res });
  }

  async generateResponse(): Promise<LLMResponse> {
    return this.queue.shift() ?? { content: 'done', toolCalls: [], tokenCount: 10, cost: 0.0001 };
  }
}

describe('Agent end-to-end (integration)', () => {
  let orchestrator: AgentOrchestrator;
  let conversations: ConversationManager;
  let rateLimiter: AgentRateLimiter;
  let accounts: AccountRepository;
  let createFromCart: jest.Mock;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };
  let llm: ScriptedLLM;

  beforeEach(async () => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    createFromCart = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentOrchestrator,
        ConversationManager,
        ToolExecutor,
        AgentRateLimiter,
        AgentToolsRegistrar,
        AdminProductsRepository,
        OrdersRepository,
        AccountRepository,
        { provide: SnapshotStore, useValue: snapshots },
        { provide: OrdersService, useValue: { createFromCart } },
        { provide: AIService, useValue: { generateDesignImage: jest.fn() } },
      ],
    }).compile();

    orchestrator = module.get(AgentOrchestrator);
    conversations = module.get(ConversationManager);
    rateLimiter = module.get(AgentRateLimiter);
    accounts = module.get(AccountRepository);
    module.get(AgentToolsRegistrar).registerAll();
    llm = new ScriptedLLM();
  });

  it('drives a discover → order flow across multiple turns', async () => {
    const conv = conversations.createConversation('sess_buyer', 'sales_copilot', 'sess_buyer');

    // Turn 1: the model searches the catalog.
    llm.enqueue({
      content: 'Let me find some options.',
      toolCalls: [{ id: 't1', name: 'search_products', arguments: { query: '' } }],
    });
    const turn1 = await orchestrator.processTurn(conv.id, 'I need merch for an event', llm);
    expect(turn1.message.toolCalls).toHaveLength(1);
    expect(turn1.toolResults?.[0]?.error).toBeUndefined();
    expect(Array.isArray(turn1.toolResults?.[0]?.result)).toBe(true);

    // The buyer has a profile + default address on file.
    accounts.updateProfile('sess_buyer', { email: 'buyer@example.com' });
    accounts.saveAddress('sess_buyer', {
      fullName: 'Bee Buyer',
      line1: '1 Market St',
      city: 'SF',
      postalCode: '94105',
      country: 'US' as never,
      isDefaultShipping: true,
    } as never);
    createFromCart.mockReturnValue({
      id: 'ord_1',
      orderNumber: 'BR-9001',
      status: 'pending_payment',
      total: { amountMinor: 5000, currency: 'USD' },
      items: [{}, {}],
    });

    // Turn 2: the model places the order.
    llm.enqueue({
      content: 'Placing your order now.',
      toolCalls: [{ id: 't2', name: 'create_order', arguments: {} }],
    });
    const turn2 = await orchestrator.processTurn(conv.id, 'Yes, order it', llm);
    expect(turn2.toolResults?.[0]?.error).toBeUndefined();
    expect((turn2.toolResults?.[0]?.result as any).orderNumber).toBe('BR-9001');
    expect(createFromCart).toHaveBeenCalledWith(
      expect.objectContaining({ cartSessionId: 'sess_buyer', customerEmail: 'buyer@example.com' }),
    );
  });

  it('accumulates token/cost usage and persists the conversation', async () => {
    const conv = conversations.createConversation('sess_buyer', 'sales_copilot', 'sess_buyer');
    llm.enqueue({ content: 'Hi there!', tokenCount: 100, cost: 0.002 });

    await orchestrator.processTurn(conv.id, 'Hello', llm);

    const updated = conversations.getConversation(conv.id);
    expect(updated?.tokenCount).toBe(100);
    expect(updated?.totalCost).toBeCloseTo(0.002, 6);
    // Usage tracked for the user.
    expect(rateLimiter.getUsage('sess_buyer').tokensUsed).toBe(100);
    // Conversation written through to the durable store.
    expect(snapshots.put).toHaveBeenCalledWith(
      'ai_conversation',
      conv.id,
      expect.objectContaining({ id: conv.id }),
      'sess_buyer',
    );
  });

  it('blocks a turn once the daily token cap is exhausted', async () => {
    process.env.AI_AGENT_MAX_TOKENS_PER_DAY = '50';
    // Re-create the limiter so it picks up the env override.
    const limited = new AgentRateLimiter(snapshots as never);
    (orchestrator as unknown as { rateLimiter: AgentRateLimiter }).rateLimiter = limited;

    const conv = conversations.createConversation('sess_capped', 'sales_copilot', 'sess_capped');
    llm.enqueue({ content: 'First reply', tokenCount: 100, cost: 0.001 });

    // First turn consumes the budget.
    await orchestrator.processTurn(conv.id, 'Hello', llm);
    // Second turn is rejected before reaching the LLM.
    await expect(orchestrator.processTurn(conv.id, 'Again', llm)).rejects.toThrow(
      RateLimitExceededError,
    );

    delete process.env.AI_AGENT_MAX_TOKENS_PER_DAY;
  });
});
