# Phase 1 Execution Plan: Data Persistence Hardening

> Detailed breakdown of converting in-memory repositories to Prisma-backed,
> with dual-write pattern (memory = source of truth, Prisma = secondary).

---

## Strategy

1. **Dual-write pattern** (already in codebase for audit/shipments/production)
   - In-memory repository stores data AND writes to Prisma (`runIfPrismaAvailable`)
   - On boot, optionally prime from Prisma if available (`readIfPrismaAvailable`)
   - No breaking changes to service layer or tests

2. **Start with highest-risk entities** (blocking real transactions)
   - **Orders** — transactions lost = business failure
   - **Payments** — financial records lost = compliance failure
   - **Accounts** — customer data lost = churn
   - **Carts** — active sessions lost = UX friction
   - **Customizations** — customer IP (designs) lost = customer anger

3. **Integration tests per repository** (verify persistence across restarts)
   - Spin up test Postgres for each spec
   - Create entity → kill API → restart → verify entity still there

4. **No service-layer changes** (repositories are the boundary)
   - Services call `ordersRepository.save(...)` as before
   - Repositories handle the dual-write internally
   - Controllers, business logic all unchanged

---

## Execution Steps

### Step 1a: Orders Repository (HIGH RISK) — ~2 days

**File:** `/apps/api/src/orders/orders.repository.ts`

**Current state:**
```typescript
private readonly orders = new Map<string, OrderDto>();
```

**Target state:**
```typescript
@Injectable()
export class OrdersRepository {
  private readonly orders = new Map<string, OrderDto>();  // In-memory cache
  
  constructor(private prismaService: PrismaService) {}
  
  async onModuleInit() {
    // Prime from Prisma if available
    await this.primeFromDatabase();
  }
  
  async save(order: OrderDto): Promise<OrderDto> {
    this.orders.set(order.id, order);
    this.byNumber.set(order.orderNumber, order.id);
    
    // Fire-and-forget write to Prisma
    runIfPrismaAvailable('orders-save', (client) =>
      client.order.upsert({
        where: { id: order.id },
        update: { ... },
        create: { ... },
      })
    );
    
    return order;
  }
  
  private async primeFromDatabase(): Promise<void> {
    const rows = await readIfPrismaAvailable('orders-prime', (client) =>
      client.order.findMany()
    );
    if (rows) {
      for (const row of rows) {
        this.orders.set(row.id, this.rowToDto(row));
      }
    }
  }
}
```

**Tests:**
- [ ] Save order → verify in memory
- [ ] Save order → verify in Prisma
- [ ] Prime from DB on boot
- [ ] Prisma unavailable → in-memory still works
- [ ] getByNumber query works
- [ ] listAll query works

---

### Step 1b: Payments Repository (HIGH RISK) — ~2 days

**File:** `/apps/api/src/payments/payments.repository.ts`

**Similar pattern to Orders, plus:**
- Webhook idempotency (already built in Phase 1 design)
- Payment status transitions (pending → authorized → captured → refunded)
- Reconciliation queries (payments by order, by customer, by provider)

**Tests:**
- [ ] Create payment → Prisma persists
- [ ] Webhook retry → idempotency prevents duplicate charge
- [ ] Payment status update → persists
- [ ] Query by order number → returns correct payment

---

### Step 1c: Accounts Repository (HIGH RISK) — ~1.5 days

**File:** `/apps/api/src/account/account.repository.ts`

**Note:** Currently minimal (just tracks session email). After this step:
- Create `User` table in Prisma (customer identity)
- Track saved addresses
- Track order history (denormalized for speed)
- Email verification status

**Tests:**
- [ ] Save address → persists
- [ ] Query addresses by email → correct list
- [ ] Update user profile → persists

---

### Step 1d: Carts Repository (MEDIUM RISK) — ~1.5 days

**File:** `/apps/api/src/cart/cart.repository.ts`

**Note:** Carts have TTL (expire after 7 days inactivity). Options:
- **A) Prisma with TTL** — add `expiresAt` column, query `WHERE expiresAt > now()`
- **B) Redis with TTL** — more efficient but requires Redis always-on
- **Current MVP strategy** — Prisma, expire via cron job or lazy-delete

**Tests:**
- [ ] Add item → cart persists
- [ ] Cart expires after 7 days
- [ ] Abandoned cart recovery (query old carts for reactivation)

---

### Step 1e: Customizations / Designs Repository (MEDIUM RISK) — ~2 days

**File:** `/apps/api/src/customizations/customizations.repository.ts`

**High-value data** — customer designs are IP, must not be lost.

**Includes:**
- Design JSON (canvas state)
- Preview images (in OSS)
- Design review status
- Audit trail (who created, who reviewed, when, why)

**Tests:**
- [ ] Save design JSON → persists
- [ ] Retrieve design by ID → returns correct state
- [ ] Design review workflow (submit → admin approves/rejects) → audit logged
- [ ] OSS preview URL generated correctly

---

### Step 1f: Quotes + RFQs Repositories (MEDIUM RISK) — ~2 days

**Files:**
- `/apps/api/src/quotes/quotes.repository.ts`
- `/apps/api/src/rfqs/rfqs.repository.ts`

**B2B pipeline:** RFQ (customer inquiry) → Quote (admin response) → Order (acceptance)

**Tests:**
- [ ] Create RFQ → persists
- [ ] Create quote → linked to RFQ
- [ ] Query RFQs by status → correct filtering
- [ ] Convert quote to order → order created, quote marked accepted

---

### Step 1g: Admin-side Repositories (MEDIUM RISK) — ~2 days

**Files:**
- `/apps/api/src/admin-products/admin-products.repository.ts`
- `/apps/api/src/admin-orders/admin-orders.repository.ts`
- `/apps/api/src/admin-templates/admin-templates.repository.ts`

**Pattern:** Products/templates are mostly seeded; admin edits must persist.

**Tests:**
- [ ] Edit product name → persists
- [ ] Edit template design → persists
- [ ] Admin order notes → persists

---

### Step 1h: Admin Users & Sessions (MEDIUM RISK) — ~1.5 days

**File:** `/apps/api/src/admin-auth/admin-users.repository.ts`

**Current:** Seed 6 users in memory, sessions in memory (lost on restart).

**Target:**
- Move users to Prisma `User` table (admins only)
- Sessions to Redis with 7-day expiry
- Password hashing: keep HMAC for MVP, plan Argon2id for Phase 3

**Tests:**
- [ ] Admin login → token issued
- [ ] Token persists across restarts
- [ ] Session expires after 7 days
- [ ] RBAC permissions loaded correctly

---

## Testing Strategy

### Unit tests per repository
```typescript
describe('OrdersRepository - persistence', () => {
  let repo: OrdersRepository;
  let prisma: PrismaService;

  beforeEach(async () => {
    // Use testcontainers to spin up a test Postgres
    const testDb = await startPostgresContainer();
    prisma = new PrismaService(testDb.connectionString);
    repo = new OrdersRepository(prisma);
  });

  it('should save and retrieve order', async () => {
    const order = { id: 'o1', orderNumber: '123', ... };
    await repo.save(order);
    const retrieved = await repo.get('o1');
    expect(retrieved).toEqual(order);
  });

  it('should persist order across restart', async () => {
    await repo.save(order);
    
    // Simulate restart by creating new repo instance
    const repo2 = new OrdersRepository(prisma);
    await repo2.onModuleInit();  // Prime from DB
    
    const retrieved = repo2.get('o1');
    expect(retrieved).toEqual(order);
  });

  it('should work without Prisma (in-memory fallback)', async () => {
    // Mock prisma to throw an error
    jest.spyOn(prisma, 'order.upsert').mockRejectedValue(new Error('DB down'));
    
    const order = { id: 'o1', ... };
    await repo.save(order);  // Should succeed
    
    expect(repo.get('o1')).toEqual(order);
  });
});
```

### Integration tests (full flow)
```typescript
describe('Orders - end-to-end persistence', () => {
  it('order survives API restart', async () => {
    // 1. Create order via API
    const res1 = await request(app.getHttpServer())
      .post('/orders')
      .send({ ... });
    const orderNumber = res1.body.orderNumber;

    // 2. Kill the app
    await app.close();

    // 3. Restart the app (in test, this re-initializes all services + primes from DB)
    await startFreshApp();

    // 4. Query order — should still exist
    const res2 = await request(app.getHttpServer())
      .get(`/account/orders/${orderNumber}`);
    expect(res2.body).toEqual(expect.objectContaining({ orderNumber }));
  });
});
```

---

## Commit Sequence

```
commit 1: "Migrate orders to Prisma-backed"
  - OrdersRepository dual-write
  - primeFromDatabase on boot
  - Unit + integration tests

commit 2: "Migrate payments to Prisma-backed"
  - PaymentsRepository dual-write
  - Idempotency guard + webhook tests

commit 3: "Migrate accounts to Prisma-backed"
  - AccountRepository → User table
  - Saved addresses

commit 4: "Migrate carts, customizations, quotes, RFQs to Prisma-backed"
  - All dual-write with tests

commit 5: "Migrate admin-side repositories to Prisma-backed"
  - Products, orders, templates persistence

commit 6: "Migrate admin auth to Prisma + Redis"
  - User table (admins only)
  - Redis-backed sessions
  - RBAC tests

commit 7: "Phase 1 integration tests"
  - Full scenario: order creation → payment → fulfillment
  - Each step survives restart
```

---

## Success Criteria

- [ ] All 11 repositories have Prisma dual-write
- [ ] All unit tests pass (testcontainers + real Postgres)
- [ ] All integration tests pass (order survival test, payment idempotency, etc.)
- [ ] Run full test suite: `pnpm test`
- [ ] Zero regressions in service layer (no breaking changes)
- [ ] Docker Compose with real DB boots cleanly
- [ ] Smoke test: Create order, restart API, order still there
- [ ] Code coverage >80% for persistence layer

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Prisma client init timing | Use onModuleInit hooks to prime before requests arrive |
| Circular dependencies | Use dependency injection via NestJS modules |
| Test flakiness | Use testcontainers for isolated DB per test |
| Migration conflicts | Keep Prisma schema in sync with existing code (no DB schema changes yet) |
| Performance | In-memory cache means reads are still fast; writes batch to DB async |

---

## Timeline

- **Days 1-2:** Orders (highest risk)
- **Days 3-4:** Payments
- **Days 5-6:** Accounts, Carts
- **Days 7-8:** Customizations, Quotes, RFQs
- **Days 9-10:** Admin repositories
- **Day 11:** Integration tests + buffer

**Total: ~2 weeks (as estimated in comprehensive plan)**
