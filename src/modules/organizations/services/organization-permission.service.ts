import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../core/redis/redis.service';
import { MemberWithRelations } from '../types/member.types';
import { Permission } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * Service for managing organization permissions in Redis
 */
@Injectable()
export class OrganizationPermissionService {
  private readonly logger = new Logger(OrganizationPermissionService.name);
  private readonly PERMISSION_PREFIX = 'org:perm';
  private readonly PERMISSION_TTL: number;

  constructor(
    private readonly redisService: RedisService,
    private readonly config: ConfigService,
  ) {
    this.PERMISSION_TTL =
      this.config.get<number>('PERMISSION_TTL', 3600) * 1000; // Convert to milliseconds
  }

  /**
   * Cache organization permissions for a user
   */
  async cachePermissions(
    userId: number,
    organizationId: number,
    member: MemberWithRelations,
  ): Promise<void> {
    try {
      const key = this.getPermissionKey(userId, organizationId);
      const permissions = this.extractPermissions(member);

      await this.redisService.set(key, permissions, this.PERMISSION_TTL);
      this.logger.debug(
        `Cached ${permissions.length} permissions for user ${userId} in organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error caching permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Get cached permissions for a user in an organization
   */
  async getPermissions(
    userId: number,
    organizationId: number,
  ): Promise<Permission[]> {
    try {
      const key = this.getPermissionKey(userId, organizationId);
      const permissions = await this.redisService.get<Permission[]>(key);

      if (!permissions) {
        this.logger.debug(
          `No cached permissions found for user ${userId} in organization ${organizationId}`,
        );
        return [];
      }

      return permissions;
    } catch (error) {
      this.logger.error(
        `Error getting permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Check if a user has a specific permission in an organization
   */
  async hasPermission(
    userId: number,
    organizationId: number,
    permission: Permission,
  ): Promise<boolean> {
    try {
      const permissions = await this.getPermissions(userId, organizationId);
      return permissions.some((p) => p.name === permission.name);
    } catch (error) {
      this.logger.error(
        `Error checking permission: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Invalidate cached permissions for a user in an organization
   */
  async invalidatePermissions(
    userId: number,
    organizationId: number,
  ): Promise<void> {
    try {
      const key = this.getPermissionKey(userId, organizationId);
      await this.redisService.del(key);
      this.logger.debug(
        `Invalidated permissions for user ${userId} in organization ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error invalidating permissions: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Extract permissions from a member
   */
  private extractPermissions(member: MemberWithRelations): Permission[] {
    const permissions = new Set<Permission>();

    // Iterate through member roles
    for (const memberRole of member.roles) {
      // Get permissions from role through RolePermission relation
      const rolePermissions = memberRole.role?.permissions || [];

      // Extract permissions from the RolePermission relation
      for (const { permission } of rolePermissions) {
        if (permission) {
          permissions.add({
            id: permission.id,
            name: permission.name,
            description: permission.description || null,
            resourceType: permission.resourceType,
            action: permission.action,
            createdAt: permission.createdAt,
          });
        }
      }
    }

    return Array.from(permissions);
  }

  /**
   * Generate Redis key for permissions
   */
  private getPermissionKey(userId: number, organizationId: number): string {
    return `${this.PERMISSION_PREFIX}:${userId}:${organizationId}`;
  }
}
