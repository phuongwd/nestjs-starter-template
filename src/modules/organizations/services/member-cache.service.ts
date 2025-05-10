import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MemberWithRelations } from '../types/member.types';
import { CacheMetrics } from '../types/member-cache.types';
import { performance } from 'perf_hooks';
import { RedisService } from '@core/redis/redis.service';

/**
 * Service for caching organization memberships and role assignments
 * Uses IORedis for better type handling and automatic serialization/deserialization
 */
@Injectable()
export class MemberCacheService {
  private readonly logger = new Logger(MemberCacheService.name);
  private readonly CACHE_PREFIX = 'org:member';
  private readonly CACHE_TTL: number;
  private readonly metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    avgRetrievalTime: 0,
    hitRate: '0%',
  };

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.CACHE_TTL = this.config.get<number>('CACHE_TTL', 3600) * 1000; // Convert to milliseconds
  }

  /**
   * Get cache key for member data
   */
  private getMemberCacheKey(userId: number, organizationId: number): string {
    return `${this.CACHE_PREFIX}:${userId}:${organizationId}`;
  }

  /**
   * Get cache key for organization members
   */
  private getOrgMembersCacheKey(organizationId: number): string {
    return `${this.CACHE_PREFIX}:org:${organizationId}`;
  }

  /**
   * Update cache metrics
   */
  private updateMetrics(startTime: number, isHit: boolean): void {
    const duration = performance.now() - startTime;
    if (isHit) {
      this.metrics.hits++;
    } else {
      this.metrics.misses++;
    }
    const totalChecks = this.metrics.hits + this.metrics.misses;
    this.metrics.avgRetrievalTime =
      (this.metrics.avgRetrievalTime * (totalChecks - 1) + duration) /
      totalChecks;
    this.metrics.hitRate = `${((this.metrics.hits / totalChecks) * 100).toFixed(2)}%`;
  }

  /**
   * Cache member data
   */
  async cacheMember(
    userId: number,
    organizationId: number,
    member: MemberWithRelations,
  ): Promise<void> {
    try {
      const key = this.getMemberCacheKey(userId, organizationId);
      await this.redis.set(key, member, this.CACHE_TTL);

      this.logger.debug(
        `Cached member data for user ${userId} in organization ${organizationId}`,
        { memberId: member.id, cacheKey: key },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache member data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          userId,
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  }

  /**
   * Get cached member data
   */
  async getCachedMember(
    userId: number,
    organizationId: number,
  ): Promise<MemberWithRelations | null> {
    const startTime = performance.now();
    try {
      const key = this.getMemberCacheKey(userId, organizationId);
      const member = await this.redis.get<MemberWithRelations>(key);

      if (!member) {
        this.updateMetrics(startTime, false);
        this.logger.debug(
          `Cache miss for member ${userId} in organization ${organizationId}`,
          { cacheKey: key },
        );
        return null;
      }

      this.updateMetrics(startTime, true);
      this.logger.debug(
        `Cache hit for member ${userId} in organization ${organizationId}`,
        { memberId: member.id, cacheKey: key },
      );
      return member;
    } catch (error) {
      this.logger.warn(
        `Failed to get cached member data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          userId,
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
      return null;
    }
  }

  /**
   * Cache organization members
   */
  async cacheOrgMembers(
    organizationId: number,
    result: { items: MemberWithRelations[]; total: number },
  ): Promise<void> {
    try {
      const key = this.getOrgMembersCacheKey(organizationId);
      await this.redis.set(key, result, this.CACHE_TTL);

      // Also cache individual member data
      await Promise.all(
        result.items.map(async (member) => {
          if (member.userId) {
            await this.cacheMember(member.userId, organizationId, member);
          }
        }),
      );

      this.logger.debug(
        `Cached ${result.items.length} members for organization ${organizationId}`,
        { cacheKey: key },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to cache organization members: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  }

  /**
   * Get cached organization members
   */
  async getCachedOrgMembers(
    organizationId: number,
  ): Promise<{ items: MemberWithRelations[]; total: number } | null> {
    const startTime = performance.now();
    try {
      const key = this.getOrgMembersCacheKey(organizationId);
      const data = await this.redis.get<{
        items: MemberWithRelations[];
        total: number;
      }>(key);

      if (!data) {
        this.updateMetrics(startTime, false);
        this.logger.debug(
          `Cache miss for organization ${organizationId} members`,
          { cacheKey: key },
        );
        return null;
      }

      this.updateMetrics(startTime, true);
      this.logger.debug(
        `Cache hit for organization ${organizationId} members: ${data.items.length} members`,
        { cacheKey: key },
      );
      return data;
    } catch (error) {
      this.logger.warn(
        `Failed to get cached organization members: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
      return null;
    }
  }

  /**
   * Invalidate member cache
   */
  async invalidateMemberCache(
    userId: number,
    organizationId: number,
  ): Promise<void> {
    try {
      const memberKey = this.getMemberCacheKey(userId, organizationId);
      const orgKey = this.getOrgMembersCacheKey(organizationId);

      await Promise.all([this.redis.del(memberKey), this.redis.del(orgKey)]);

      this.logger.debug(
        `Invalidated cache for member ${userId} in organization ${organizationId}`,
        { memberKey, orgKey },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate member cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          userId,
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  }

  /**
   * Invalidate organization members cache
   */
  async invalidateOrgMembersCache(organizationId: number): Promise<void> {
    try {
      const key = this.getOrgMembersCacheKey(organizationId);
      await this.redis.del(key);
      this.logger.debug(
        `Invalidated cache for organization ${organizationId}`,
        {
          cacheKey: key,
        },
      );
    } catch (error) {
      this.logger.warn(
        `Failed to invalidate organization members cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          organizationId,
          error: error instanceof Error ? error.stack : undefined,
        },
      );
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }
}
