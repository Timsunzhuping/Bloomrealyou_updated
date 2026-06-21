-- Phase 1 persistence: generic durable snapshot store.
--
-- Backs the in-memory aggregate repositories (orders, payments, carts,
-- designs, quotes, RFQs, accounts) so their data survives restarts and is
-- shared across instances. Repositories prime from these rows at boot and
-- write-through on mutation.

CREATE TABLE "entity_snapshots" (
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "refKey" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_snapshots_pkey" PRIMARY KEY ("kind", "entityId")
);

CREATE INDEX "entity_snapshots_kind_refKey_idx" ON "entity_snapshots"("kind", "refKey");

CREATE INDEX "entity_snapshots_kind_updatedAt_idx" ON "entity_snapshots"("kind", "updatedAt");
