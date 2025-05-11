/**
 * Setup system injection tokens
 * @description Tokens for dependency injection in the setup system
 */
export const SETUP_TOKENS = {
  REPOSITORY: {
    SETUP_TOKEN: 'SETUP_TOKEN_REPOSITORY',
  },
  SERVICE: {
    SETUP: 'SETUP_SERVICE',
  },
} as const;

/**
 * Setup audit action types
 * @description Possible actions that can be audited during setup
 */
export enum SetupAuditAction {
  TOKEN_GENERATED = 'TOKEN_GENERATED',
  SETUP_ATTEMPTED = 'SETUP_ATTEMPTED',
  SETUP_COMPLETED = 'SETUP_COMPLETED',
  SETUP_FAILED = 'SETUP_FAILED',
}

/**
 * Setup token validity duration in hours
 */
export const SETUP_TOKEN_VALIDITY_HOURS = 24;

/**
 * Setup token length in characters
 */
export const SETUP_TOKEN_LENGTH = 32;
