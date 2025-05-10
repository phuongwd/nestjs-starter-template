/**
 * Injection tokens for custom domain module dependencies
 * These tokens are used to identify dependencies in the DI container
 */
export const INJECTION_TOKENS = {
  REPOSITORY: {
    CUSTOM_DOMAIN: 'CUSTOM_DOMAIN_REPOSITORY',
    SSL_CERTIFICATE: 'SSL_CERTIFICATE_REPOSITORY',
  },
} as const;
