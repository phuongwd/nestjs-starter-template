import { AsyncLocalStorage } from 'async_hooks';

/**
 * TenantContext manages organization context for multi-tenant isolation.
 *
 * In this application, "tenant" refers to "organization" - organizations are the tenants
 * in our multi-tenant architecture. This context maintains the current organization ID
 * throughout the request lifecycle.
 *
 * This class uses AsyncLocalStorage to ensure context isolation between concurrent requests
 * without relying on request objects being passed through all layers of the application.
 *
 * Usage:
 * - In middleware: TenantContext.setCurrentTenantId(organizationId)
 * - In services/repositories: TenantContext.getCurrentTenantId()
 * - In lifecycle hooks: TenantContext.clear() when request completes
 */
export class TenantContext {
  private static storage = new AsyncLocalStorage<number>();

  /**
   * Gets the current organization ID from the tenant context
   * @returns The current organization ID or undefined if not set
   */
  static getCurrentTenantId(): number | undefined {
    return this.storage.getStore();
  }

  /**
   * Sets the current organization ID in the tenant context
   * @param tenantId The organization ID to set as the current tenant
   */
  static setCurrentTenantId(tenantId: number): void {
    this.storage.enterWith(tenantId);
  }

  /**
   * Clears the tenant context
   * Should be called at the end of the request lifecycle
   */
  static clear(): void {
    this.storage.disable();
    this.storage = new AsyncLocalStorage<number>();
  }

  /**
   * Runs a callback with a specific tenant (organization) context
   * @param tenantId The organization ID to use as tenant context
   * @param callback The function to execute within this tenant context
   * @returns The result of the callback
   */
  static runWithTenant<T>(tenantId: number, callback: () => T): T {
    return this.storage.run(tenantId, callback);
  }
}
