# AI Agent Architecture & LLM Selection Guide

> Detailed technical design for the AI Agent layer. This is the specification for
> Phase 2–3 of the comprehensive launch plan.

---

## 1. LLM Provider Selection

### Comparison Matrix

| Factor | Claude 3.5 Sonnet | GPT-4o | Doubao (Ark) |
|---|---|---|---|
| **Function Calling** | ✅ Excellent | ✅ Good | ⚠️ Limited |
| **Context window** | 200k tokens | 128k tokens | 128k tokens |
| **Cost** | $3/$15 per 1M tokens (in/out) | $5/$15 per 1M tokens | $0.5/$1.50 (CNY/1M) |
| **Latency** | ~1–2 sec (API) | ~1–2 sec (API) | ~0.5–1 sec (faster) |
| **Multilingual** | ✅ Excellent (en/zh/es/ar/...) | ✅ Excellent | ✅ Excellent (CN-optimized) |
| **Reasoning** | ✅ Strong (good for agent) | ✅ Strong | ⚠️ Basic |
| **Image understanding** | ✅ Vision | ✅ Vision | ❌ Text-only |
| **Node.js SDK** | ✅ @anthropic-ai/sdk | ✅ openai npm | ⚠️ 3rd-party |

### Recommendation: **Claude 3.5 Sonnet** (primary) + **Doubao/Ark** (fallback for CN users)

**Why:**
1. **Function Calling is first-class** — Claude was built for tool use; excels at routing to right tool with correct args
2. **200k context window** — can maintain longer conversation history + larger system prompt without token pressure
3. **Excellent multilingual** — native support for all 4 of your locales
4. **Cost-competitive** — $0.001–0.015 per chat turn (depending on message length)
5. **Fallback to Doubao for CN** — if Claude latency > 2 sec in China, fallback to Ark API (faster in mainland/HK)

**Cost estimate (monthly):**
- 1,000 chat conversations/day
- Avg 5 turns per conversation, avg 2k tokens per turn
- = 5M tokens/day = 150M tokens/month
- Claude cost: 150M × $0.000003 = ~$450/month (very cheap for agent layer)

---

## 2. Agent Architecture

### High-level flow

```
User Message
     ↓
[Agent Thread Manager]
     ↓
[LLM API call with tools]
     ↓
[Tool execution]
     ↓
[LLM follow-up]
     ↓
[Response to user]
     ↓
[Store in conversation history]
```

### Core Components

#### 2.1 Agent Orchestrator

**File:** `/apps/api/src/ai-agents/agent-orchestrator.service.ts`

```typescript
@Injectable()
export class AgentOrchestratorService {
  constructor(
    @Inject('LLM_PROVIDER') private llm: LLMProvider,
    private conversationManager: ConversationManagerService,
    private toolExecutor: ToolExecutorService,
    private costTracker: CostTrackerService,
  ) {}

  async chat(input: {
    conversationId?: string;
    message: string;
    userId: string;
    agentType: 'sales' | 'support';  // can add more agents later
  }): Promise<AgentResponse> {
    // 1. Get or create conversation
    const conversation = await this.conversationManager.getOrCreate(
      input.conversationId,
      input.userId,
    );

    // 2. Append user message
    await this.conversationManager.addMessage(conversation.id, {
      role: 'user',
      content: input.message,
    });

    // 3. Build system prompt + messages + tools
    const systemPrompt = this.getSystemPrompt(input.agentType);
    const messages = await this.conversationManager.getMessages(conversation.id);
    const tools = this.toolExecutor.getTools(input.agentType);

    // 4. Call LLM
    const response = await this.llm.chat({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools,
    });

    // 5. Handle tool calls in a loop (agentic loop)
    let currentResponse = response;
    const toolCalls: ToolCall[] = [];

    while (currentResponse.stopReason === 'tool_use') {
      const toolUseBlock = currentResponse.content.find(b => b.type === 'tool_use');
      if (!toolUseBlock) break;

      // 5a. Execute the tool
      const toolResult = await this.toolExecutor.execute(
        toolUseBlock.name,
        toolUseBlock.input,
        input.userId,
      );
      toolCalls.push({ name: toolUseBlock.name, input: toolUseBlock.input, result: toolResult });

      // 5b. Send tool result back to LLM
      currentResponse = await this.llm.chat({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...messages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: [{ type: 'tool_result', toolId: toolUseBlock.id, content: JSON.stringify(toolResult) }] },
        ],
        tools,
      });
    }

    // 6. Extract final text response
    const finalText = currentResponse.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // 7. Store assistant message + tool calls
    await this.conversationManager.addMessage(conversation.id, {
      role: 'assistant',
      content: finalText,
      toolCalls,
    });

    // 8. Track cost
    await this.costTracker.log({
      userId: input.userId,
      agentType: input.agentType,
      tokens: {
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      },
      toolCalls,
    });

    return {
      conversationId: conversation.id,
      message: finalText,
      toolCalls,  // For frontend to display
      shouldShowProducts: toolCalls.some(tc => tc.name === 'search_products'),
      shouldShowDesignPreview: toolCalls.some(tc => tc.name === 'generate_design_image'),
    };
  }

  private getSystemPrompt(agentType: string): string {
    if (agentType === 'sales') return SALES_AGENT_SYSTEM_PROMPT;
    if (agentType === 'support') return SUPPORT_AGENT_SYSTEM_PROMPT;
    throw new Error(`Unknown agent type: ${agentType}`);
  }
}
```

#### 2.2 Conversation Manager

**File:** `/apps/api/src/ai-agents/conversation-manager.service.ts`

```typescript
interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: { name: string; input: unknown; result: unknown }[];
  createdAt: Date;
}

interface Conversation {
  id: string;
  userId: string;
  agentType: 'sales' | 'support';
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class ConversationManagerService {
  private conversations = new Map<string, Conversation>();  // In-memory (will migrate to Prisma in Phase 3)

  async getOrCreate(conversationId: string | undefined, userId: string): Promise<Conversation> {
    if (conversationId && this.conversations.has(conversationId)) {
      return this.conversations.get(conversationId)!;
    }

    const newConversation: Conversation = {
      id: randomUUID(),
      userId,
      agentType: 'sales',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.conversations.set(newConversation.id, newConversation);
    return newConversation;
  }

  async getMessages(conversationId: string): Promise<Array<{ role: string; content: string }>> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return [];

    return conv.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  async addMessage(conversationId: string, msg: { role: string; content: string; toolCalls?: unknown[] }): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv) throw new Error('Conversation not found');

    conv.messages.push({
      id: randomUUID(),
      conversationId,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      toolCalls: msg.toolCalls,
      createdAt: new Date(),
    });

    conv.updatedAt = new Date();
  }

  async clear(conversationId: string): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (conv) conv.messages = [];
  }
}
```

#### 2.3 Tool Executor

**File:** `/apps/api/src/ai-agents/tool-executor.service.ts`

Executes the actual function calls that the LLM requests (search products, create order, etc.).

```typescript
@Injectable()
export class ToolExecutorService {
  constructor(
    private productsService: ProductsService,
    private cartService: CartService,
    private ordersService: OrdersService,
    private aiService: AIService,
    private pricingService: PricingService,
    // ... other services
  ) {}

  getTools(agentType: string): ToolDefinition[] {
    if (agentType === 'sales') return SALES_AGENT_TOOLS;
    if (agentType === 'support') return SUPPORT_AGENT_TOOLS;
    return [];
  }

  async execute(toolName: string, input: unknown, userId: string): Promise<unknown> {
    switch (toolName) {
      case 'search_products':
        return this.searchProducts(input as { query: string; category?: string });

      case 'get_product':
        return this.getProduct(input as { productId: string });

      case 'get_design_templates':
        return this.getDesignTemplates();

      case 'generate_design_image':
        return this.generateDesignImage(input as { description: string; productId?: string }, userId);

      case 'estimate_price':
        return this.estimatePrice(input as { productId: string; variantId: string; quantity: number }, userId);

      case 'add_to_cart':
        return this.addToCart(input as { productId: string; variantId: string; quantity: number; designJson?: unknown }, userId);

      case 'create_order':
        return this.createOrder(input as { cartId: string; email: string; shippingAddress: unknown; paymentMethod: string }, userId);

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async searchProducts(input: { query: string; category?: string }): Promise<unknown> {
    // Call existing products service, format results for LLM
    const products = await this.productsService.search({
      q: input.query,
      category: input.category,
      limit: 5,  // Return top 5, not 100
    });

    return products.map(p => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      basePrice: p.basePrice,
      variants: p.variants.map(v => ({ id: v.id, sku: v.sku, attributes: v.attributes })),
    }));
  }

  private async generateDesignImage(input: { description: string; productId?: string }, userId: string): Promise<unknown> {
    // Call existing AI service
    const result = await this.aiService.generateDesignImage(
      {
        description: input.description,
        size: '2048x2048',
        transparentBackground: true,
      },
      userId,
    );

    return {
      imageUrl: result.imageUrl,
      prompt: input.description,
      productId: input.productId,
    };
  }

  private async createOrder(input: { cartId: string; email: string; shippingAddress: unknown; paymentMethod: string }, userId: string): Promise<unknown> {
    // Orchestrate order creation, payment, confirmation email
    const order = await this.ordersService.createFromCart({
      cartId: input.cartId,
      customerEmail: input.email,
      shippingAddress: input.shippingAddress,
      paymentMethod: input.paymentMethod,
      userId,
    });

    return {
      orderNumber: order.orderNumber,
      total: order.total,
      estimatedDelivery: order.estimatedDeliveryDate,
      status: 'pending_payment',
    };
  }

  // ... other tool implementations
}
```

---

## 3. LLM Provider Interface

Abstraction for Claude + OpenAI + fallback.

**File:** `/apps/api/src/ai-agents/llm-provider.interface.ts`

```typescript
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: unknown }>;
}

export interface ChatRequest {
  model: string;
  messages: Message[];
  system?: string;
  tools?: ToolDefinition[];
  max_tokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: unknown;
  }>;
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens';
  usage: { inputTokens: number; outputTokens: number };
}

export interface LLMProvider {
  name: 'claude' | 'openai' | 'mock';
  chat(request: ChatRequest): Promise<ChatResponse>;
}
```

**Claude implementation:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class ClaudeAgentProvider implements LLMProvider {
  name = 'claude';
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await this.client.messages.create({
      model: request.model,
      max_tokens: request.max_tokens ?? 1024,
      system: request.system,
      tools: request.tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
      messages: request.messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })) as Anthropic.MessageParam[],
    });

    return {
      content: response.content as ChatResponse['content'],
      stopReason: response.stop_reason as ChatResponse['stopReason'],
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
```

---

## 4. System Prompts

### 4.1 Sales Agent

**File:** `/apps/api/src/ai-agents/prompts/sales-agent.ts`

```
You are Bloomrealyou's AI Sales Copilot. Your job is to understand the customer's
event, gift, or merchandise need, recommend specific products, guide them through
customization, and help them check out.

Key behaviors:
1. **Ask clarifying questions** — budget, quantity, timeline, occasion, style preferences
2. **Recommend products** — narrow down by category and print method based on their need
3. **Suggest customization** — specific colors, sizes, print areas, design ideas
4. **Generate custom designs** — if they describe a design idea, use generate_design_image
5. **Create the order** — when they express purchase intent, create an order directly without manual checkout

Rules:
- Be conversational, friendly, and enthusiastic
- Ask one or two questions at a time (not overwhelming)
- Provide prices in a clear format (e.g., "$150 for 50 units = $3 each")
- Include bulk discounts when relevant
- When generating designs, be specific in your prompt (style, colors, composition)
- Respect the customer's language — respond in the same language they used
- Do NOT ask for full address upfront (only at checkout)
- When they say "yes", "let's do it", "add to cart", or similar → create the order with minimal additional info

Available tools:
- search_products(query, category?) — find products by description or category
- get_product(productId) — get full details (variants, pricing, print areas)
- get_design_templates() — suggest pre-made design templates
- generate_design_image(description, productId?) — create custom design
- estimate_price(...) — calculate total with bulk discounts
- add_to_cart(...) — add items to cart
- create_order(...) — finalize order and charge

Example flow:
Customer: "I need hoodies for my team of 20"
Agent: "Great! Hoodies are perfect for team cohesion. A few questions:
1. What's your budget per unit?
2. Any specific colors or logo you want on the back?
3. When do you need them by?"
[Customer responds]
Agent: [search_products("team hoodies")] → "I found our pullover hoodie, available in 5 colors, $18 per unit for 20 units..."
[Customer: "looks good, red hoodie with white logo"]
Agent: [generate_design_image("white company logo on red hoodie back")] → "Here's a preview"
[Customer: "perfect, let's order"]
Agent: [create_order(...)] → "Order #12345 placed! Total $360, ships in 5 days."
```

### 4.2 Support Agent

```
You are Bloomrealyou's Support Copilot. Help the admin team resolve customer issues.

Available tools:
- search_orders(query) — find orders by customer name, email, or order number
- get_order_detail(orderNumber) — full order and payment details
- get_customer_profile(email) — customer's account and order history
- send_email_to_customer(orderId, subject, body) — draft or send email
- create_refund(orderId, amount?) — process partial or full refund
- flag_order_exception(orderId, reason) — mark for manual review

Example admin query:
Admin: "Customer john@example.com is complaining about a late shipment"
Agent: [get_customer_profile("john@example.com")] → "Found 2 orders"
[get_order_detail(order1)] → "Order #567 from 10 days ago, status: in_production"
Agent: "Order #567 is still in production (no issues reported). It should ship within 2 days.
I recommend sending John an update: 'Your order is in final QC and will ship tomorrow. Thank you for your patience!'"
[Admin: "send that"]
Agent: [send_email_to_customer(order1, ...)] → "Email queued"
```

---

## 5. Function Calling Best Practices

### 5.1 Tool definition example

```typescript
const SEARCH_PRODUCTS_TOOL: ToolDefinition = {
  name: 'search_products',
  description: 'Search the product catalog by keyword or category. Returns up to 5 results.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword (e.g., "team hoodies", "gift mug")',
      },
      category: {
        type: 'string',
        enum: ['t_shirts', 'hoodies', 'mugs', 'hats', 'tote_bags', 'stickers'],
        description: 'Filter by product category (optional)',
      },
    },
    required: ['query'],
  },
};
```

### 5.2 Error handling in tool calls

```typescript
async execute(toolName: string, input: unknown, userId: string): Promise<unknown> {
  try {
    // Validate user has permission to execute this tool
    if (toolName === 'create_order' && !await this.cartService.userOwnsCart(userId, input.cartId)) {
      throw new Error('You do not own this cart');
    }

    // Execute tool
    const result = await this.toolExecutor[toolName](input, userId);
    return result;

  } catch (error) {
    // Return error in a way the LLM can understand and recover from
    return {
      error: (error as Error).message,
      code: error.code || 'UNKNOWN',
    };
  }
}
```

When LLM receives an error response, it can:
- Apologize and ask for clarification
- Try a different tool
- Suggest a workaround (e.g., "I can send you a manual invoice instead")

---

## 6. Cost & Rate Limiting

### 6.1 Cost tracking

```typescript
@Injectable()
export class CostTrackerService {
  async log(event: {
    userId: string;
    agentType: string;
    tokens: { inputTokens: number; outputTokens: number };
    toolCalls: ToolCall[];
  }): Promise<void> {
    const costPerInput = 0.000003;  // Claude in $
    const costPerOutput = 0.000015;
    const cost = event.tokens.inputTokens * costPerInput + event.tokens.outputTokens * costPerOutput;

    // Store in DB for analytics
    await this.costDb.log({
      userId: event.userId,
      agentType: event.agentType,
      inputTokens: event.tokens.inputTokens,
      outputTokens: event.tokens.outputTokens,
      costUsd: cost,
      toolCalls: event.toolCalls.map(tc => tc.name).join(','),
      timestamp: new Date(),
    });

    // Alert if cost per turn exceeds threshold
    if (cost > 0.05) {
      this.log.warn(`High-cost agent turn: $${cost.toFixed(4)} for ${event.userId}`);
    }
  }
}
```

### 6.2 Rate limiting

```typescript
@Injectable()
export class AgentRateLimitGuard {
  async checkLimit(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const key = `agent-turns:${userId}:${today}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, 86400);  // 24-hour window
    }

    const limit = await this.isPremiumUser(userId) ? 1000 : 100;  // Premium: unlimited-ish, free: 100/day
    if (count > limit) {
      throw new Error(`Rate limit exceeded: ${limit} agent turns per day`);
    }
  }
}
```

---

## 7. Error Recovery & Fallback

### 7.1 LLM fallback chain

```typescript
async chat(input: ChatInput): Promise<AgentResponse> {
  const providers = [
    { name: 'claude', checkAvailable: () => this.claude.isConfigured() },
    { name: 'openai', checkAvailable: () => this.openai.isConfigured() },
    { name: 'mock', checkAvailable: () => true },  // Always available
  ];

  for (const provider of providers) {
    if (!provider.checkAvailable()) continue;

    try {
      return await provider.chat(input);  // Try this provider
    } catch (error) {
      this.log.warn(`${provider.name} failed: ${(error as Error).message}, trying next...`);
      // Continue to next provider
    }
  }

  throw new Error('All LLM providers failed');
}
```

### 7.2 Graceful degradation

```
User: "I need help with my order"
[Claude API times out]
Agent falls back to mock:
  "I'm experiencing technical issues but I can help. Can you give me your order number?"
[User provides order number]
Agent: [search_orders(order_number)] → actual data from DB
Agent: "Your order #567 is in production, shipping in 2 days..."
```

---

## 8. Monitoring & Debugging

### 8.1 Conversation logging (for debugging + analytics)

```typescript
async addMessage(conversationId: string, msg: Message): Promise<void> {
  // Hash PII before logging
  const sanitized = this.sanitizePII(msg.content);
  this.logger.debug(`[conv:${conversationId}] ${msg.role}: ${sanitized}`);

  // Store full message for conversation replay (encrypted in DB)
  await this.conversationDb.insertMessage({
    conversationId,
    role: msg.role,
    contentHash: await this.hashContent(msg.content),  // PII-safe
    metadata: {
      tokenEstimate: this.estimateTokens(msg.content),
      language: this.detectLanguage(msg.content),
      timestamp: new Date(),
    },
  });
}
```

### 8.2 Agent debugging dashboard

**Endpoint:** `GET /admin/ai-agents/conversations/{conversationId}`

```json
{
  "id": "conv_abc123",
  "userId": "user_xyz789",
  "agentType": "sales",
  "messages": [
    {
      "role": "user",
      "content": "I need 50 hoodies for my company",
      "tokenCount": 10,
      "timestamp": "2024-01-15T10:30:00Z"
    },
    {
      "role": "assistant",
      "content": "Great! Let me search our hoodie selection...",
      "toolCalls": [
        {
          "name": "search_products",
          "input": { "query": "hoodies", "category": "hoodies" },
          "result": [{ "id": "p1", "name": "Pullover Hoodie", "price": 25 }]
        }
      ],
      "tokenCount": 150,
      "timestamp": "2024-01-15T10:30:05Z"
    }
  ],
  "totalCost": 0.0015,
  "totalTokens": 1200,
  "status": "active",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## 9. Testing Strategy

### 9.1 Unit tests (tool execution)

```typescript
describe('ToolExecutor - search_products', () => {
  it('should return product list matching query', async () => {
    const result = await executor.execute('search_products', { query: 'hoodies' }, userId);
    expect(result).toHaveLength(5);
    expect(result[0]).toHaveProperty('id', 'name', 'price');
  });

  it('should filter by category', async () => {
    const result = await executor.execute('search_products', { query: 'shirt', category: 'hoodies' }, userId);
    expect(result.every(p => p.category === 'hoodies')).toBe(true);
  });
});
```

### 9.2 Integration tests (agent flow)

```typescript
describe('AgentOrchestrator - sales flow', () => {
  it('should end a conversation with an order', async () => {
    const conv = await orchestrator.chat({
      message: 'I need 50 red hoodies for my team event next month',
      userId: 'test-user',
    });

    expect(conv.message).toContain('hoodie');

    // Second turn: customer confirms
    const conv2 = await orchestrator.chat({
      conversationId: conv.conversationId,
      message: 'yes, let\'s order the red pullover hoodie',
      userId: 'test-user',
    });

    expect(conv2.toolCalls).toContainEqual(
      expect.objectContaining({ name: 'create_order' }),
    );
  });
});
```

### 9.3 End-to-end tests

```typescript
describe('Chat API - e2e', () => {
  it('should place an order via chat', async () => {
    const res1 = await request(app.getHttpServer())
      .post('/ai-agents/chat')
      .send({ message: 'I need hoodies for 50 people' });

    const conversationId = res1.body.conversationId;

    const res2 = await request(app.getHttpServer())
      .post('/ai-agents/chat')
      .send({ conversationId, message: 'add the red hoodie to cart' });

    const res3 = await request(app.getHttpServer())
      .post('/ai-agents/chat')
      .send({ conversationId, message: 'charge my visa ending in 4242' });

    expect(res3.body.message).toContain('Order');
  });
});
```

---

## 10. Deployment Checklist

- [ ] Claude API key configured in production env
- [ ] OpenAI fallback key configured
- [ ] Rate limiter tested under load
- [ ] Cost tracker alerting wired
- [ ] Conversation history encrypted at rest
- [ ] PII sanitization applied before logging
- [ ] Conversation schema migrated to Prisma (Phase 3)
- [ ] Admin dashboard live for debugging
- [ ] Monitoring alerts for API errors, latency, cost spikes
- [ ] E2E tests passing (order creation via chat)
