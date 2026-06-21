import { Test, TestingModule } from '@nestjs/testing';
import { ConversationManager } from './conversation-manager.service';
import { SnapshotStore } from '../../_lib/snapshot-store';

describe('ConversationManager', () => {
  let manager: ConversationManager;
  let snapshots: { loadAll: jest.Mock; put: jest.Mock; remove: jest.Mock };

  beforeEach(async () => {
    snapshots = { loadAll: jest.fn().mockResolvedValue([]), put: jest.fn(), remove: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationManager, { provide: SnapshotStore, useValue: snapshots }],
    }).compile();
    manager = module.get(ConversationManager);
  });

  it('should create a new conversation', () => {
    const conv = manager.createConversation('user123', 'sales_copilot');
    expect(conv.id).toBeTruthy();
    expect(conv.userId).toBe('user123');
    expect(conv.agentType).toBe('sales_copilot');
    expect(conv.messages).toEqual([]);
    expect(conv.tokenCount).toBe(0);
    expect(conv.totalCost).toBe(0);
  });

  it('should add user and assistant messages', () => {
    const conv = manager.createConversation('user123', 'sales_copilot');

    const userMsg = manager.addUserMessage(conv.id, 'Hello, I need a t-shirt');
    expect(userMsg.role).toBe('user');
    expect(userMsg.content).toBe('Hello, I need a t-shirt');

    const assistantMsg = manager.addAssistantMessage(
      conv.id,
      'I can help with that!',
      [],
      100,
      0.05,
    );
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.content).toBe('I can help with that!');

    const messages = manager.getMessages(conv.id);
    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('user');
    expect(messages[1]?.role).toBe('assistant');
  });

  it('should add tool results to assistant messages', () => {
    const conv = manager.createConversation('user123', 'sales_copilot');
    manager.addUserMessage(conv.id, 'Find me a product');
    manager.addAssistantMessage(
      conv.id,
      'Searching...',
      [{ id: 'call_1', name: 'search_products', arguments: { query: 'shirt' } }],
      100,
      0.05,
    );

    manager.addToolResults(conv.id, [
      {
        toolCallId: 'call_1',
        name: 'search_products',
        result: { products: ['shirt1', 'shirt2'] },
      },
    ]);

    const messages = manager.getMessages(conv.id);
    const lastMsg = messages[messages.length - 1];
    expect(lastMsg?.toolResults).toHaveLength(1);
    expect(lastMsg?.toolResults?.[0]?.name).toBe('search_products');
  });

  it('should track token count and cost across messages', () => {
    const conv = manager.createConversation('user123', 'sales_copilot');
    expect(conv.tokenCount).toBe(0);
    expect(conv.totalCost).toBe(0);

    manager.addAssistantMessage(conv.id, 'Response 1', [], 50, 0.01);
    let updated = manager.getConversation(conv.id);
    expect(updated?.tokenCount).toBe(50);
    expect(updated?.totalCost).toBe(0.01);

    manager.addAssistantMessage(conv.id, 'Response 2', [], 75, 0.015);
    updated = manager.getConversation(conv.id);
    expect(updated?.tokenCount).toBe(125);
    expect(updated?.totalCost).toBeCloseTo(0.025, 5);
  });

  it('should retrieve non-existent conversation as undefined', () => {
    const conv = manager.getConversation('nonexistent');
    expect(conv).toBeUndefined();
  });

  it('should throw on adding message to non-existent conversation', () => {
    expect(() => manager.addUserMessage('nonexistent', 'Hello')).toThrow();
  });

  it('should write-through conversation mutations to the durable store', () => {
    const conv = manager.createConversation('user123', 'sales_copilot', 'sess_1');
    expect(snapshots.put).toHaveBeenCalledWith(
      'ai_conversation',
      conv.id,
      expect.objectContaining({ id: conv.id, sessionId: 'sess_1' }),
      'user123',
    );

    snapshots.put.mockClear();
    manager.addUserMessage(conv.id, 'Hello');
    expect(snapshots.put).toHaveBeenCalledTimes(1);
  });

  it('should restore conversations from the durable store after a restart', async () => {
    // Simulate a persisted conversation from a previous process.
    const persisted = {
      id: 'conv_restored',
      userId: 'user123',
      sessionId: 'sess_1',
      agentType: 'sales_copilot' as const,
      messages: [
        { id: 'm1', role: 'user' as const, content: 'Hi', createdAt: new Date().toISOString() },
      ],
      tokenCount: 42,
      totalCost: 0.02,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    snapshots.loadAll.mockResolvedValueOnce([
      { entityId: persisted.id, refKey: 'user123', data: persisted },
    ]);

    await manager.onModuleInit();

    const restored = manager.getConversation('conv_restored');
    expect(restored).toBeDefined();
    expect(restored?.tokenCount).toBe(42);
    expect(restored?.messages).toHaveLength(1);
  });

  it('should list conversations for a user newest-first', () => {
    const a = manager.createConversation('userA', 'sales_copilot');
    manager.createConversation('userB', 'support_agent');
    const c = manager.createConversation('userA', 'support_agent');

    const list = manager.listForUser('userA');
    expect(list).toHaveLength(2);
    expect(list.map((x) => x.id)).toEqual(expect.arrayContaining([a.id, c.id]));
  });
});
