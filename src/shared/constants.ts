/**
 * Organization context header used for multi-tenant requests
 *
 * This header is used to specify which organization (tenant) the request is for.
 * It's used by the TenantContextMiddleware to establish the tenant context
 * for the duration of the request, ensuring proper multi-tenant isolation.
 *
 * Format: X-Organization-Id: 123
 */
export const ORGANIZATION_HEADER = 'X-Organization-Id';
