import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RequiredPermission } from '../../../shared/types/permission.types';

/**
 * Permission Service
 *
 * Primary service for managing and checking permissions throughout the application.
 * This service provides comprehensive permission management functionality and is used
 * by business logic components (controllers, services, etc.).
 *
 * Key Features:
 * 1. Permission Management:
 *    - Fetch user permissions across organizations
 *    - Check permission requirements
 *    - Handle complex permission scenarios
 *
 * 2. Flexible Organization Context:
 *    - Check permissions for specific organization
 *    - Check permissions across all organizations
 *    - Handle organization-specific permission rules
 *
 * 3. Rich Permission Information:
 *    - Detailed permission data
 *    - Permission hierarchy support
 *    - Role-based permission inheritance
 *
 * Key Differences from PermissionCheckerService:
 * 1. Purpose:
 *    - PermissionService: Complete permission management system
 *    - PermissionCheckerService: Guard-specific simple checks
 *
 * 2. Scope:
 *    - PermissionService: Used throughout the application
 *    - PermissionCheckerService: Used only by PermissionGuard
 *
 * 3. Flexibility:
 *    - PermissionService: Handles complex scenarios, optional organization context
 *    - PermissionCheckerService: Simple yes/no checks, required organization context
 *
 * Usage Examples:
 *
 * 1. Check Permissions for Specific Organization:
 * ```typescript
 * const hasAccess = await permissionService.hasPermissions(
 *   userId,
 *   organizationId,
 *   [{ resource: 'users', action: 'manage' }]
 * );
 * ```
 *
 * 2. Get All User Permissions:
 * ```typescript
 * const permissions = await permissionService.getUserPermissions(userId);
 * ```
 *
 * 3. Check Permissions Across Organizations:
 * ```typescript
 * const hasAccess = await permissionService.hasPermissions(
 *   userId,
 *   undefined, // Check across all organizations
 *   [{ resource: 'system', action: 'admin' }]
 * );
 * ```
 *
 * Note on Circular Dependencies:
 * This service may have complex dependencies as it's part of the permissions module.
 * For guard-level permission checks, use PermissionCheckerService instead to avoid
 * circular dependency issues.
 *
 * @see PermissionCheckerService For guard-specific permission checks
 * @see RequiredPermission For permission type definitions
 */
@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all permissions for a user in a specific organization context
   *
   * @param userId - The ID of the user
   * @param organizationId - Optional organization context
   * @returns Set of permission strings in format "resource:action"
   *
   * @example
   * const permissions = await fetchUserPermissions(1, 2);
   * // Returns Set(['users:read', 'users:write', ...])
   */
  private async fetchUserPermissions(
    userId: number,
    organizationId?: number,
  ): Promise<Set<string>> {
    const userMemberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        ...(organizationId && { organizationId }),
        status: 'ACTIVE',
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return new Set(
      userMemberships.flatMap((member) =>
        member.roles.flatMap((memberRole) =>
          memberRole.role.permissions.map(
            (rp) => `${rp.permission.resourceType}:${rp.permission.action}`,
          ),
        ),
      ),
    );
  }

  /**
   * Check if a user has all required permissions
   *
   * @param userId - The ID of the user to check
   * @param organizationId - Optional organization context
   * @param requiredPermissions - Array of required permissions
   * @returns Promise<boolean> - True if user has all required permissions
   *
   * @example
   * const canManageUsers = await hasPermissions(
   *   1,
   *   2,
   *   [{ resource: 'users', action: 'manage' }]
   * );
   */
  async hasPermissions(
    userId: number,
    organizationId: number | undefined,
    requiredPermissions: RequiredPermission[],
  ): Promise<boolean> {
    try {
      const userPermissions = await this.fetchUserPermissions(
        userId,
        organizationId,
      );

      if (userPermissions.size === 0) {
        this.logger.debug(
          `No active memberships found for user ${userId} in organization ${organizationId}`,
        );
        return false;
      }

      return requiredPermissions.every((required) => {
        const permissionKey = `${required.resource}:${required.action}`;
        const hasPermission = userPermissions.has(permissionKey);

        if (!hasPermission) {
          this.logger.debug(
            `User ${userId} lacks permission: ${permissionKey}`,
          );
        }

        return hasPermission;
      });
    } catch (error) {
      this.logger.error(
        `Error checking permissions for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  /**
   * Get all permissions for a user
   *
   * @param userId - The ID of the user
   * @param organizationId - Optional organization context
   * @returns Array of permission strings
   *
   * @example
   * const permissions = await getUserPermissions(1);
   * // Returns ['users:read', 'users:write', ...]
   */
  async getUserPermissions(
    userId: number,
    organizationId?: number,
  ): Promise<string[]> {
    try {
      const userPermissions = await this.fetchUserPermissions(
        userId,
        organizationId,
      );
      return Array.from(userPermissions);
    } catch (error) {
      this.logger.error(
        `Error fetching permissions for user ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }
}
