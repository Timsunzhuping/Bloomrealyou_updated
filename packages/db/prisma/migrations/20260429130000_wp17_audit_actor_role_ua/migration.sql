-- WP-17: capture the actor's role + user-agent at audit time so the security
-- review screen can attribute mutations even after permissions are revoked.

ALTER TABLE "audit_logs"
  ADD COLUMN "actorRole" TEXT,
  ADD COLUMN "userAgent" TEXT;
