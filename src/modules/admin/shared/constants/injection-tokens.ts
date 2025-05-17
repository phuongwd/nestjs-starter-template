/**
 * Injection tokens for admin module dependencies
 */
export const INJECTION_TOKENS = {
  REPOSITORY: {
    ADMIN_AUDIT: 'ADMIN_AUDIT_REPOSITORY',
    ADMIN_SESSION: 'ADMIN_SESSION_REPOSITORY',
  },
  SERVICE: {
    ADMIN_AUDIT: 'ADMIN_AUDIT_SERVICE',
    ADMIN_SESSION: 'ADMIN_SESSION_SERVICE',
    KNEX: 'KNEX_SERVICE',
  },
} as const;
