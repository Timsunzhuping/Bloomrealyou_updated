import { Test, TestingModule } from '@nestjs/testing';
import { ConversationManager } from './conversation-manager.service';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConversationManager],
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
});
