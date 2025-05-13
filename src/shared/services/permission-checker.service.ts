import { Injectable, Logger } from '@nestjs/common';
import { RequiredPermission } from '../types/permission.types';
import { performance } from 'perf_hooks';
import { OrganizationPermissionService } from '../../modules/organizations/services/organization-permission.service';
import { MetricsResponseDto } from '../../modules/monitoring/dtos/metrics.response.dto';
import { SystemRoleService } from '../../modules/admin/system-roles/services/system-role.service';
// import { MemberService } from '@/modules/organizations/services/member.service';

interface PermissionMetrics extends MetricsResponseDto {
  totalChecks: number;
  errors: number;
  averageCheckTime: number;
  totalCheckTime: number;
  systemAdminBypasses: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRate: string;
}

/**
 * Permission Checker Service
 *
 * This service is specifically designed for the PermissionGuard to check user permissions
 * without causing circular dependencies. While it shares similar logic with PermissionService,
 * it serves a different purpose in the application architecture.
 *
 * Key Differences from PermissionService:
 * 1. Scope:
 *    - PermissionService: Full permission management, used throughout the application
 *    - PermissionCheckerService: Guard-specific checks only
 *
 * 2. Usage:
 *    - PermissionService: Used by business logic, controllers, and services
 *    - PermissionCheckerService: Used exclusively by PermissionGuard
 *
 * 3. Features:
 *    - PermissionService: Rich permission information, flexible organization checks
 *    - PermissionCheckerService: Simple boolean validation, required organizationId
 *
 * 4. Dependencies:
 *    - PermissionService: May have complex dependencies
 *    - PermissionCheckerService: Minimal dependencies to avoid circular issues
 *
 * Why Two Services?
 * - Avoid Circular Dependencies: Guards are used by many modules, including the permissions module
 * - Single Responsibility: Each service has a clear, focused purpose
 * - Performance: Guard checks are optimized for yes/no decisions
 *
 * Usage Example:
 * ```typescript
 * // In PermissionGuard
 * const hasAccess = await this.permissionChecker.hasPermissions(
 *   userId,
 *   organizationId,
 *   requiredPermissions
 * );
 * ```
 *
 * @see PermissionService For full permission management functionality
 * @see PermissionGuard For how this service is used in authorization
 */
@Injectable()
export class PermissionCheckerService {
  private readonly logger = new Logger(PermissionCheckerService.name);
  private readonly metrics: PermissionMetrics = {
    totalChecks: 0,
    errors: 0,
    averageCheckTime: 0,
    totalCheckTime: 0,
    systemAdminBypasses: 0,
    cacheHits: 0,
    cacheMisses: 0,
    cacheHitRate: '0%',
  };

  constructor(
    private readonly organizationPermissionService: OrganizationPermissionService,
    private readonly systemRoleService: SystemRoleService,
    // private readonly memberService: MemberService,
  ) {}

  /**
   * Check if user is system admin and can bypass permission checks
   */
  private async isSystemAdmin(userId: number): Promise<boolean> {
    return this.systemRoleService.hasSystemRole(userId, 'SYSTEM_ADMIN');
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(startTime: number, isHit: boolean): void {
    const duration = performance.now() - startTime;
    this.metrics.totalCheckTime += duration;
    this.metrics.averageCheckTime =
      this.metrics.totalCheckTime / this.metrics.totalChecks;

    if (isHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }

    const totalChecks = this.metrics.cacheHits + this.metrics.cacheMisses;
    this.metrics.cacheHitRate = `${((this.metrics.cacheHits / totalChecks) * 100).toFixed(2)}%`;
  }

  /**
   * Get detailed metrics for monitoring
   */
  public getMetrics(): PermissionMetrics {
    return { ...this.metrics };
  }

  /**
   * Convert required permission to permission string
   */
  private getPermissionString(required: RequiredPermission): string {
    return `${required.resource.toLowerCase()}:${required.action.toLowerCase()}`;
  }

  /**
   * Check if a user has all required permissions in an organization
   *
   * @param userId - The ID of the user to check
   * @param organizationId - The ID of the organization context
   * @param requiredPermissions - Array of permissions to check
   * @returns Promise<boolean> - True if user has all required permissions
   *
   * @example
   * const canAccess = await hasPermissions(
   *   1, // userId
   *   2, // organizationId
   *   [{ resource: 'users', action: 'read' }]
   * );
   */
  async hasPermissions(
    userId: number,
    organizationId: number,
    requiredPermissions: RequiredPermission[],
  ): Promise<boolean> {
    try {
      const startTime = performance.now();
      this.metrics.totalChecks++;

      // Check for system admin bypass
      if (await this.isSystemAdmin(userId)) {
        this.metrics.systemAdminBypasses++;
        this.updatePerformanceMetrics(startTime, true);
        return true;
      }

      // get to cache member and its permissions
      // const member = await this.memberService.getMember(organizationId, userId);
      // if (!member) {
      //   this.logger.warn(
      //     `Member not found for userId: ${userId}, organizationId: ${organizationId}`,
      //   );
      //   this.metrics.errors++;
      //   return false;
      // }

      // Get user's permissions from Redis
      const permissions =
        await this.organizationPermissionService.getPermissions(
          userId,
          organizationId,
        );

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every((required) => {
        const permissionString = this.getPermissionString(required);
        return permissions.some(
          (p) => p.name.toLowerCase() === permissionString,
        );
      });

      this.updatePerformanceMetrics(startTime, permissions.length > 0);
      return hasAllPermissions;
    } catch (error) {
      this.logger.error(
        `Error checking permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      this.metrics.errors++;
      return false;
    }
  }
}
