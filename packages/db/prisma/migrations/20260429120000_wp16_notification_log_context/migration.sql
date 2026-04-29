-- WP-16: enrich notification_logs with subject, provider name, and the
-- contextual entity ids the admin UI filters by.

ALTER TABLE "notification_logs"
  ADD COLUMN "subject"  TEXT,
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "orderId"  UUID,
  ADD COLUMN "rfqId"    UUID,
  ADD COLUMN "quoteId"  UUID;

CREATE INDEX "notification_logs_orderId_idx" ON "notification_logs"("orderId");
CREATE INDEX "notification_logs_rfqId_idx"   ON "notification_logs"("rfqId");
CREATE INDEX "notification_logs_quoteId_idx" ON "notification_logs"("quoteId");
