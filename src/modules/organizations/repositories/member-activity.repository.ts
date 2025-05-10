import { Injectable, Logger } from '@nestjs/common';
import { BaseRepository } from '../../../shared/repositories/base.repository';
import { IMemberActivityRepository } from '../interfaces/member-activity.repository.interface';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityMetadata } from '../types/activity-metadata.types';

export interface MemberActivity {
  id: number;
  organizationId: number;
  memberId: number;
  action: string;
  metadata: ActivityMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Repository for managing member activities with tenant awareness and monitoring
 */
@Injectable()
export class MemberActivityRepository
  extends BaseRepository<MemberActivity>
  implements IMemberActivityRepository
{
  protected readonly logger = new Logger(MemberActivityRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'memberActivity');
  }

  protected isTenantAware(): boolean {
    return true;
  }

  /**
   * Convert ActivityMetadata to Prisma JSON value
   */
  private convertMetadataToJson(
    metadata: ActivityMetadata | undefined,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (!metadata) {
      return Prisma.JsonNull;
    }

    // Convert the metadata to a plain object
    const jsonMetadata = {
      ...metadata,
      // Ensure all properties are JSON-serializable
      timestamp: metadata.timestamp,
      type: metadata.type,
      // Add any other necessary transformations
    };

    return jsonMetadata as Prisma.InputJsonValue;
  }

  /**
   * Create a member activity record
   */
  async create(data: {
    organizationId: number;
    memberId: number;
    action: string;
    metadata: ActivityMetadata;
  }): Promise<void> {
    await this.trackActivity(
      data.organizationId,
      data.memberId,
      data.action,
      data.metadata,
    );
  }

  /**
   * Track member activity
   */
  async trackActivity(
    organizationId: number,
    memberId: number,
    action: string,
    metadata?: ActivityMetadata,
  ): Promise<void> {
    return this.withTenantContext(async () => {
      await this.prisma.memberActivity.create({
        data: this.applyTenantContext({
          organizationId,
          memberId,
          action,
          metadata: this.convertMetadataToJson(metadata),
        }),
      });
    });
  }

  /**
   * Get member activities with pagination
   */
  async getActivities(
    organizationId: number,
    memberId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    activities: MemberActivity[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return this.withTenantContext(async () => {
      const skip = (page - 1) * limit;

      const [activities, total] = await Promise.all([
        this.prisma.memberActivity.findMany({
          where: this.applyTenantContext({
            organizationId,
            memberId,
          }),
          orderBy: {
            createdAt: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            organizationId: true,
            memberId: true,
            action: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        this.prisma.memberActivity.count({
          where: this.applyTenantContext({
            organizationId,
            memberId,
          }),
        }),
      ]);

      return {
        activities: activities.map((activity) => ({
          ...activity,
          metadata: activity.metadata as ActivityMetadata | null,
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    });
  }

  /**
   * Get recent activities for a member
   */
  async getRecentActivities(
    organizationId: number,
    memberId: number,
    limit: number = 5,
  ): Promise<MemberActivity[]> {
    return this.withTenantContext(async () => {
      const activities = await this.prisma.memberActivity.findMany({
        where: this.applyTenantContext({
          organizationId,
          memberId,
        }),
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        select: {
          id: true,
          organizationId: true,
          memberId: true,
          action: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return activities.map((activity) => ({
        ...activity,
        metadata: activity.metadata as ActivityMetadata | null,
      }));
    });
  }

  /**
   * Clean up old activities
   */
  async cleanupOldActivities(
    organizationId: number,
    olderThan: Date,
  ): Promise<number> {
    return this.withTenantContext(async () => {
      const result = await this.prisma.memberActivity.deleteMany({
        where: this.applyTenantContext({
          organizationId,
          createdAt: {
            lt: olderThan,
          },
        }),
      });
      return result.count;
    });
  }
}
