import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { TenantContext } from '../context/tenant.context';

/**
 * Decorator to extract the organization ID from the tenant context
 *
 * This decorator retrieves the current organization ID from the TenantContext
 * and throws an UnauthorizedException if it's not available. This helps
 * standardize organization context validation across controllers.
 *
 * Usage:
 * ```typescript
 * // In a controller method where organizationId is directly used
 * @Get()
 * async getSomeResource(@OrganizationId() organizationId: number) {
 *   // organizationId is used directly here
 *   return this.service.getSomeResource(organizationId);
 * }
 *
 * // In a controller method where organizationId is not directly referenced
 * @Get(':id')
 * async getSomeOtherResource(
 *   @Param('id') id: number,
 *   @OrganizationId() _organizationId: number // Note the underscore prefix
 * ) {
 *   // _organizationId is not directly used here
 *   return this.service.getSomeOtherResourceById(id);
 * }
 * ```
 *
 * Naming Convention:
 * - Use `organizationId` (without underscore) when the parameter is actively used in the method body
 * - Use `_organizationId` (with underscore) when the parameter is required for context but not directly referenced
 *
 * This eliminates the need for repetitive organization ID validation in every controller method.
 */
export const OrganizationId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): number => {
    const organizationId = TenantContext.getCurrentTenantId();

    if (!organizationId) {
      throw new UnauthorizedException('Organization context is required');
    }

    return organizationId;
  },
);

/**
 * Helper function to get the required organization ID from TenantContext
 *
 * This utility function can be used within services or controllers to obtain
 * the current organization ID from TenantContext, throwing an exception if
 * the context is missing.
 *
 * @returns The current organization ID
 * @throws UnauthorizedException if organization context is missing
 */
export function getRequiredOrganizationId(): number {
  const organizationId = TenantContext.getCurrentTenantId();

  if (!organizationId) {
    throw new UnauthorizedException('Organization context is required');
  }

  return organizationId;
}
