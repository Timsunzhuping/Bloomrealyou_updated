/** Request-scoped token populated by AdminBearerGuard once a request authenticates. */
export const ADMIN_USER_REQ_KEY = 'adminUser';

/** Request-scoped token populated by AdminBearerGuard with audit context. */
export const ADMIN_AUDIT_CONTEXT_KEY = 'adminAuditContext';
