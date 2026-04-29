-- WP-18: align Prisma enums with the runtime vocabulary used by WP-14 / WP-15.
--
-- DesignStatus gains `revision_requested` (introduced in WP-14 to track admin-
-- requested customer revisions).
--
-- ProductionJobStatus gains the WP-15 ten-state vocabulary
-- (created / assigned / supplier_confirmed / in_production / qc_pending /
--  qc_passed / qc_failed / ready_to_ship / shipped / cancelled). The legacy
-- WP-02 values (queued / in_progress / quality_check / completed / failed)
-- stay so existing rows remain valid; new writes go through the WP-15 names.
--
-- Adding values to a Postgres enum is a single ALTER TYPE per value. The
-- runtime status mapper in `apps/api/src/admin-production/admin-production.prisma-sink.ts`
-- continues to translate WP-15 statuses into legacy ones until the next
-- WP backfills the rows; once that's done the legacy values can be dropped
-- in a follow-up migration with a value-rewriting UPDATE.

ALTER TYPE "design_status" ADD VALUE IF NOT EXISTS 'revision_requested';

ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'created';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'supplier_confirmed';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'in_production';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'qc_pending';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'qc_passed';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'qc_failed';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'ready_to_ship';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'shipped';
ALTER TYPE "production_job_status" ADD VALUE IF NOT EXISTS 'cancelled';
