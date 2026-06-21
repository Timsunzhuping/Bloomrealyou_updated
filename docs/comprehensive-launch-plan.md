# Comprehensive Launch Roadmap: Alibaba Cloud + AI Agent Platform

> This document synthesizes two streams of work:
> 1. **Data persistence & launch** (阿里云上线的前置条件)
> 2. **AI Agent transformation** (用户的新需求：智能客服、自动下单、生图)
>
> Timeline: **8–12 weeks** to a full production launch with AI Agent capabilities.

---

## I. Current State vs. Desired State

### What's built today
✅ **Product catalog** — 18 seeded products, variants, pricing tiers, print areas, designs  
✅ **2D customizer** — Konva.js canvas, design JSON, preview generation  
✅ **Cart & checkout** — Stripe + PayPal payment collection  
✅ **Storefront** — 28 public pages, i18n (en/zh-CN/es/ar), mobile-responsive  
✅ **Admin console** — 28 pages, orders/production/shipments/suppliers/RFQ management  
✅ **AI helpers** — 9 capabilities: slogan/ideas/suggestions/image generation/printability/risk/logo/gift-set  
✅ **Providers** — Real integrations: OpenAI, Doubao, SendGrid, EasyPost, Stripe, PayPal

### The critical gap
❌ **Data persists in memory only** — orders/payments/accounts/designs/carts lost on restart  
❌ **AI is passive** — point-and-click buttons, no multi-turn conversation, no autonomy  
❌ **No order automation** — customers must manually select products, AI only suggests  
❌ **No customer AI agent** — no chat interface, no needs-understanding, no follow-up  
❌ **Image generation is limited** — design-only, not a user-facing feature  
❌ **No admin-side AI** — no agent-assisted customer support, no auto-responses  

---

## II. Phased Development Plan

Phases are **sequential but with parallelization** where noted.

### **PHASE 0: Alibaba Cloud Infrastructure Setup** (1–2 days)
**Parallel with Phase 1.**

**Deliverable:** Staging environment live on Alibaba Cloud HK/SG, ready for data ingestion.

- [ ] ECS instance (Ubuntu 22.04, 2 vCPU / 4 GB), VPC
- [ ] RDS PostgreSQL 16 (managed) or in-stack postgres container
- [ ] Redis/Tair (managed) or in-stack redis container
- [ ] MinIO or OSS bucket for object storage
- [ ] Domain + DNS A record to ECS EIP
- [ ] nginx + Let's Encrypt TLS termination
- [ ] `docker compose -f docker-compose.prod.yml up -d` + health check

**Reference:** `docs/deploy-alibaba-cloud.md`  
**Exit criteria:** `curl https://api.bloomrealyou.com/health` returns `{"status":"ok"}`

---

### **PHASE 1: Data Persistence Hardening** (1.5–2 weeks)
**Core blocker for any real transactions.**

Convert in-memory repositories to Prisma-backed. This is mandatory before AI agents touch orders.

#### 1a. High-risk entities (critical path)
- [ ] **Orders** — from memory Map to Prisma + write-through, including `OrderItem` snapshots
- [ ] **Payments** — transaction records, webhook idempotency, reconciliation
- [ ] **Accounts** — customer profiles, saved addresses, email verification
- [ ] **Carts** — session-based or Redis-backed with TTL (can also move to frontend Zustand + BE save-on-request)

#### 1b. Mid-risk entities
- [ ] **Customizations / CustomerDesign** — design JSON + preview URLs in OSS, design review workflow
- [ ] **Quotes + RFQs** — B2B pipeline, audit trail
- [ ] **Admin products / templates** — back-office edits persist

#### 1c. Admin-side persistence
- [ ] **Admin users + sessions** — move from seed map to `User` table (admins only), sessions to Redis with expiry
- [ ] Password hashing → Argon2id (security, not just MVP HMAC)
- [ ] Permission enforcement stays role-based but loads from DB

#### Pattern to use everywhere
Use the proven **Prisma dual-write** pattern already in the codebase:
- In-memory repository as **source of truth**
- Lazy-load from Prisma at boot (`readIfPrismaAvailable`)
- Write to both synchronously, but don't block on DB (`runIfPrismaAvailable` fire-and-forget)
- Eventually: swap in-memory ↔ Prisma (Phase 1.5)

#### Integration tests
- [ ] Spin up a test Postgres per spec (testcontainers / GitHub service container)
- [ ] Verify order survives API restart
- [ ] Verify payment webhook idempotency across restarts

**Exit criteria:** Kill & restart the API; all orders, payments, carts, customers still there. Multi-instance deployments work.

---

### **PHASE 2: AI Agent Framework (Backend)** (1.5–2 weeks)

Build the **Agent orchestration layer** that handles multi-turn conversations, function calling, and autonomy.

#### 2a. Agent Service + Conversation Manager
**New module:** `/apps/api/src/ai-agents/`

- [ ] **ConversationManager** — stores message history per session/user, context windows, threading
  - Tables: `conversation` (id, userId, createdAt, updatedAt), `message` (id, conversationId, role, content, tokens)
  - In-memory fallback for MVP; Prisma-backed at phase 3
- [ ] **AgentOrchestrator** — routes conversation to agent, executes function calls, tracks state
  - Config: system prompt, function definitions, temperature, max tokens
  - Supports multiple agent personas (e.g., sales agent vs. support agent)

#### 2b. Core Agent: Sales Copilot
**Purpose:** Understand customer needs, recommend products, guide through customization, auto-checkout.

**System prompt:**
```
You are Bloomrealyou's AI sales assistant. Your job is to:
1. Understand the customer's event, gift, or merchandise need
2. Ask clarifying questions (budget, quantity, timeline, preferences)
3. Recommend specific products from our catalog
4. Guide them through customization (color, size, print area, design)
5. Suggest AI-generated designs if needed
6. Create a cart and guide them to checkout
7. Be concise, friendly, and multilingual (auto-detect language)

You have access to:
- Product catalog (search, list by category)
- Design templates (suggest starter designs)
- Design image generator (generate custom designs)
- Pricing calculator (bulk discounts, rush fees)
- Cart management (add items, estimate shipping/tax)
- Order creation (auto-checkout with customer's payment method if saved)

When the customer expresses purchase intent, create an order. Do NOT wait for manual checkout.
```

**Tools (Function Calling):**
1. `search_products(query: string, category?: string)` → product list
2. `get_product(productId: string)` → full product detail + variants + pricing
3. `get_design_templates()` → available design templates
4. `generate_design_image(description: string, productId: string)` → URL + prompt
5. `estimate_price(productId: string, variant: string, quantity: number, printMethod: string)` → total
6. `add_to_cart(productId: string, variantId: string, quantity: number, designJson?: object)` → cart ID
7. `create_order(cartId: string, email: string, shippingAddress: object, paymentMethod: 'stripe'|'paypal'|'manual')`
8. `get_shipping_options(zipCode: string)` → carriers, times, costs
9. `check_order_status(orderNumber: string)` → status, tracking, ETA

#### 2c. LLM Provider Integration

**Choice of LLM:**
- **Anthropic Claude API** (recommended) — Function Calling, 100k context window, strong reasoning
  - Use `claude-3-5-sonnet-20241022` or newer
  - Structured tool input/output via JSON
  - Streaming support for real-time responses
- **Alternative:** OpenAI GPT-4o (already integrated via `OPENAI_API_KEY`)
  - Function Calling available
  - Slightly lower cost
  - More mature integrations in Node.js ecosystem

**Implementation:**
- [ ] New provider: `AgentLLMProvider` (interface for both Anthropic + OpenAI)
- [ ] `AnthropicAgentProvider` — calls Anthropic API, handles function calling, token counting
- [ ] Fallback to mock for dev without API keys
- [ ] Rate limiting per user (e.g., 10 conversations/day free user, unlimited for premium)
- [ ] Cost tracking (log tokens, cost per agent turn)

#### 2d. Agent Endpoints

**REST API:**
```
POST /ai-agents/chat
  body: { conversationId?: uuid, message: string, userId?: string }
  response: { role: 'assistant', content: string, functionCalls?: [...] }

GET /ai-agents/conversations/{conversationId}
  response: { id, messages: [...], createdAt, updatedAt }

POST /ai-agents/conversations/{conversationId}/clear
  (reset conversation for reboot)
```

**WebSocket alternative (nice-to-have for Phase 3):**
```
ws://api.bloomrealyou.com/ai-agents/chat/{conversationId}
  send: { message: string }
  receive: { delta: string }  (streaming)
```

**Exit criteria:**
- Agent responds to "I need 50 custom hoodies for my team" with sensible follow-ups
- Agent can execute a full conversation → order creation without human intervention
- Conversation history persists and resumes correctly

---

### **PHASE 3: Frontend AI Chat Interface** (1 week)

Replace the single-line "AI prompt" with a proper **conversational chat UI**.

#### 3a. Chat Component
**Location:** `/apps/web/src/components/ai-chat/`

- [ ] **ChatInterface** — scrollable message list, auto-scroll to latest, timestamps
- [ ] **MessageBubble** — role (user/assistant), markdown support, code blocks
- [ ] **InputBox** — text input with submit button, character limit, loading state
- [ ] **FunctionCallDisplay** — show function calls & results (product cards, design previews)
- [ ] **DesignPreview** — inline image generation results, tap to add to cart
- [ ] **ProductCard** (in chat context) — tap to customize, add to cart, view details
- [ ] **Conversation Management** — list past conversations, resume, clear history

#### 3b. Pages & Flows
- [ ] `/[locale]/ai-chat` — dedicated chat page (primary entry point)
- [ ] `/[locale]/` (home) — embedded chat widget in hero or sidebar (secondary)
- [ ] `/[locale]/customize/[productSlug]` — AI panel for design suggestions (existing, integrate with new agent)
- [ ] `/[locale]/account/conversations` — customer's chat history

#### 3c. Client-side Agent Management
- [ ] `useAIChat(conversationId)` hook — fetch message history, send message, handle streaming
- [ ] `useAIFunctionDisplay(call)` hook — render function calls (product recommendations, pricing, etc.)
- [ ] Optimistic UI — show user message immediately, stream assistant response
- [ ] Error handling — display LLM errors gracefully, allow retry

#### 3d. Integration with existing flows
- [ ] Chat-to-customizer handoff: agent recommends product → "Customize now" button → `/customize?designId=...`
- [ ] Chat-to-checkout handoff: agent creates order → "Review order" button → `/checkout?orderId=...`
- [ ] Cart awareness: agent can see user's existing cart, ask about modifications

**Exit criteria:**
- User opens chat, describes a need, agent recommends products, user clicks "customize", lands in 2D editor
- User completes order via chat (no manual checkout needed)
- Conversation persists across browser refresh

---

### **PHASE 4: Image Generation UI** (3–5 days)

Expose AI image generation as a **standalone, user-facing feature** — not just design-assistant-only.

#### 4a. New page: `/[locale]/generate-image`
- [ ] **ImageGenUI** — text prompt input, style/size dropdown, negative prompt (optional)
- [ ] **Generation history** — list of user's generated images, tap to view/download/add-to-cart
- [ ] **Quota display** — show remaining daily image generation credits
- [ ] **Download / add-to-design** — save to desktop or forward to customizer
- [ ] **Upscaling option** — if using image with upscaler (e.g., Upscayl)

#### 4b. Backend: Standalone image generation
- [ ] Existing endpoint `/ai/generate-design-image` already supports standalone generation (not tied to a design)
- [ ] Add image variations: `generate_variations(imageUrl: string)` → 3–4 variations
- [ ] Add image upscaling (optional): integrate with a 3rd-party upscaler (e.g., Replicate, real-esrgan)
- [ ] Cost control: charge "image credits" per generation (e.g., 5 credits/image, 1 credit/variation)

#### 4c. Multi-provider image generation
- [ ] OpenAI DALL-E 3 (currently used) — cost ~$0.08/image
- [ ] Replicate / Stability AI API — cheaper alternatives (~$0.01–0.03/image)
- [ ] Provider selection: fallback chain (OpenAI → Replicate → mock)
- [ ] UI note: show estimated cost or credit deduction before generation

**Exit criteria:**
- User opens `/generate-image`, types "a cozy winter design", gets 4 results in <30 sec
- User can download, upscale, or add to cart
- Quota/cost tracking works

---

### **PHASE 5: Admin AI Agent (Customer Support)** (1 week)

**Purpose:** Assist admins in customer support, order management, and proactive outreach.

#### 5a. Support Agent
**System prompt:**
```
You are an admin assistant for Bloomrealyou. Help the admin team with:
1. Answering customer inquiries (look up order status, shipping, returns)
2. Drafting customer responses (professional, multilingual)
3. Flagging issues (delays, quality concerns, refunds)
4. Recommending actions (resend confirmation email, issue partial refund, expedite shipping)
5. Searching orders/customers by name, email, order number
6. Monitoring production jobs for delays
7. Generating follow-up messages (shipping notification, upsell, reviews)

Available tools:
- search_orders
- get_order_detail
- get_customer_profile
- send_email_to_customer
- create_refund
- flag_order_exception
- list_production_jobs_delayed
- generate_customer_email_draft
```

#### 5b. Predictive Outreach
- [ ] **Pro-active notifications** — agent detects patterns and recommends actions:
  - "5 orders pending production for >7 days — suggest expediting or issuing partial refund"
  - "Customer hasn't viewed tracking for 3 days — send automated shipping update"
  - "Order completed 2 weeks ago — send review request"
- [ ] **Batch actions** — agent generates email templates for bulk outreach

#### 5c. Admin chat widget
- [ ] `/[locale]/(app)/support-agent` — dedicated page
- [ ] Sidebar widget in admin dashboard
- [ ] Conversation persistence tied to admin user + order context

**Exit criteria:**
- Admin can ask "which orders are delayed?" → agent lists with flagging suggestions
- Admin can draft a refund response → agent generates personalized email
- System sends proactive notifications (1–2 per day)

---

### **PHASE 6: Payment & Order Automation** (3–5 days)

**Prerequisite:** Phases 1 (persistence) + 2 (agent).

#### 6a. Agent-initiated checkout
- [ ] Agent calls `create_order(...)` with full order details (no user interaction required)
- [ ] System auto-charges Stripe/PayPal if customer has a saved payment method
- [ ] Order confirmation email sent automatically
- [ ] Cart cleared

#### 6b. Smart retry logic
- [ ] Payment fails → agent asks "Would you like to try a different payment method?" or "I can send you an invoice"
- [ ] Webhook delivery fails → idempotency store + retry queue (already built in Phase 1)

#### 6c. One-click reorder
- [ ] Agent suggests "Would you like to reorder your last hoodies?" → customer clicks → order created

**Exit criteria:**
- Agent conversation ends with order placed and payment processed, zero manual steps

---

### **PHASE 7: Internationalization & Localization** (3–5 days)

**Prerequisite:** Phase 3 (frontend chat).

#### 7a. Multi-language agent
- [ ] Agent auto-detects language from user message
- [ ] Respond in detected language
- [ ] Fallback to user's locale setting
- [ ] Supported: en, zh-CN, es, ar (RTL for ar)

#### 7b. Region-specific behaviors
- [ ] Currency display per region (USD, CNY, EUR, AED)
- [ ] Shipping methods per region
- [ ] Tax/VAT calculation per region
- [ ] Product availability (some designs not allowed in certain regions)
- [ ] Payment methods per region (WeChat Pay for CN, etc.)

#### 7c. RTL support (for ar)
- [ ] Chat UI mirror layout
- [ ] Product cards, cards, buttons flip RTL

**Exit criteria:**
- User types in Chinese → agent responds in Chinese, all UI is RTL-aware
- Agent respects region-specific constraints (e.g., can't ship certain items to certain countries)

---

### **PHASE 8: Analytics, Monitoring, Cost Control** (1 week)

#### 8a. Observability
- [ ] **Agent conversation logs** — all turns, function calls, errors stored in DB (privacy: hash PII)
- [ ] **LLM cost tracking** — log tokens in, tokens out, cost per turn, per user, per agent
- [ ] **Function call success rate** — which tools work, which fail, why
- [ ] Dashboard: daily API calls, cost, error trends

#### 8b. Cost control
- [ ] **Rate limiting** — per-user tokens per day (e.g., 1M tokens/day free, then pay-as-you-go)
- [ ] **Quota system** — daily image generation credits, conversation turn limits
- [ ] **Timeout guards** — max 60 sec per agent turn, max 30 turns per conversation
- [ ] **Provider fallbacks** — if Claude overloaded, fall back to OpenAI or mock

#### 8c. Safety & compliance
- [ ] **Input validation** — reject injections, profanity filters (optional)
- [ ] **Output filtering** — PII redaction before logging (phone, email, address)
- [ ] **Audit trail** — which admin made what order changes, when
- [ ] **GDPR compliance** — allow customer to download/delete conversation history

**Exit criteria:**
- Dashboard shows real-time agent usage, cost, errors
- Rate limiter prevents runaway cost (e.g., spam requests)

---

### **PHASE 9: Production Hardening & Launch** (1 week)

#### 9a. Stress testing
- [ ] Load test: 100 concurrent chat sessions, measure latency, cost
- [ ] Long conversation: 50+ turns, verify context window doesn't overflow, cost bounded
- [ ] Failure modes: LLM timeout, function call error, webhook failure → graceful fallback

#### 9b. Security audit
- [ ] SQL injection in agent queries (paranoid: use parameterized queries everywhere)
- [ ] Prompt injection (try jailbreaking the agent, verify it resists)
- [ ] Function call authorization (agent can only call functions user is allowed to invoke)
- [ ] Payment security (agent can't create orders for other users)

#### 9c. Go-live checklist
- [ ] All data persistent (Phase 1 ✓)
- [ ] AI agent responds reliably (Phase 2 ✓)
- [ ] Frontend chat works (Phase 3 ✓)
- [ ] Image generation works (Phase 4 ✓)
- [ ] Admin support agent works (Phase 5 ✓)
- [ ] Payment automation works (Phase 6 ✓)
- [ ] Multi-language works (Phase 7 ✓)
- [ ] Cost tracking works (Phase 8 ✓)
- [ ] Smoke test: full journey (chat → design → payment → confirmation)
- [ ] Monitor: errors, latency, cost for 24 hours on staging

---

## III. Timeline & Parallelization

```
Week 1     |████████| Phase 0 (Infra) + Phase 1a (Orders/Payments/Accounts)
Week 2     |████████| Phase 1b/1c (Carts/Customizations/Admin) + Phase 2 (Agent Framework)
Week 3     |████████| Phase 2 (continue) + Phase 3 (Frontend Chat)
Week 4     |████████| Phase 3 (continue) + Phase 4 (Image Gen UI)
Week 5     |████████| Phase 4 (continue) + Phase 5 (Admin Agent)
Week 6     |████████| Phase 5 (continue) + Phase 6 (Payment Automation)
Week 7     |████████| Phase 6 (continue) + Phase 7 (i18n)
Week 8     |████████| Phase 7 (continue) + Phase 8 (Analytics)
Week 9     |████████| Phase 8 (continue) + Phase 9 (Launch prep)
Week 10    |████████| Phase 9 (continue) + Buffer/Polish
Week 11–12 |████████| Buffer + Launch monitoring

Total: 10–12 weeks with one focused engineer.
With two engineers: 6–8 weeks (parallelize phases 1c/2, 2/3, 4/5).
```

---

## IV. Risk Mitigation

| Risk | Mitigation |
|---|---|
| **Phase 1 (persistence)** takes longer than 2 weeks | Start immediately in parallel with Phase 0; prioritize Orders/Payments only if needed for MVP |
| **LLM API goes down** | Implement fallback to mock, queue up requests, have manual override in admin |
| **Image generation costs spike** | Cap daily spend per user, show cost upfront, offer credit packages |
| **Agent hallucinates product details** | Retrieve product data from DB, not pure LLM generation; validate all prices before creating orders |
| **Stripe/PayPal webhook delivery fails** | Already handled by idempotency + retry queue (Phase 1) |
| **Payment edge case: agent creates order but payment fails** | Retry with customer's alternate payment, offer manual invoice, notify admin |

---

## V. Success Metrics

| Metric | Target |
|---|---|
| **Agent conversion rate** (chat → order placed) | >30% |
| **Average chat turns to order** | <10 turns |
| **Chat latency** (user message → agent response) | <2 sec |
| **LLM cost per conversation** | <$0.10 |
| **Image generation success rate** | >95% |
| **Admin agent usage** | >50% of orders reviewed with agent suggestions |
| **System uptime** | >99.5% (chat + order + payment) |
| **Customer satisfaction** (post-chat survey) | >4.5/5 |

---

## VI. Deliverables Summary

By end of Phase 9, you will have:

1. ✅ **Production-grade data layer** — all commerce data persistent, multi-instance ready
2. ✅ **AI Sales Copilot** — autonomous agent that understands needs → recommends → guides → orders
3. ✅ **Chat UI** — conversational interface, message history, function call visualization
4. ✅ **Image generation** — user-facing feature, generate custom designs on demand
5. ✅ **Admin AI** — support agent for customer inquiries, proactive outreach
6. ✅ **Multi-language** — full support for en/zh-CN/es/ar, region-specific behavior
7. ✅ **Observability** — cost tracking, error monitoring, usage analytics
8. ✅ **Live on Alibaba Cloud** — HK/SG region, TLS, automated backups, Stripe/PayPal webhooks
9. ✅ **All seeded data** — 18 products, 6 suppliers, templates, demo orders, admin accounts

---

## VII. Immediate Next Steps

**Today:**
1. [ ] Confirm LLM choice (Claude vs. OpenAI) — recommend Claude for Function Calling
2. [ ] Confirm Alibaba Cloud credentials — schedule Phase 0 infra setup
3. [ ] Confirm image generation provider (DALL-E 3 vs. Replicate) — cost and latency tradeoff

**This week:**
1. [ ] Phase 0 infrastructure go-live on Alibaba Cloud staging
2. [ ] Start Phase 1 with Orders + Payments persistence
3. [ ] Design Phase 2 agent system prompt and tools spec (detailed PRD)

**Next week:**
1. [ ] Phase 1 persistence tests passing
2. [ ] Phase 2 agent endpoints live (can test with curl)
3. [ ] Phase 3 frontend chat UI kickoff
