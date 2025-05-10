import { Injectable, Logger } from '@nestjs/common';
import { AdminAuditLog, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { IAdminAuditRepository } from '../interfaces/admin-audit.repository.interface';

interface CreateAuditLogData {
  userId: number;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Repository for managing admin audit logs
 */
@Injectable()
export class AdminAuditRepository
  extends BaseRepository<AdminAuditLog>
  implements IAdminAuditRepository
{
  protected readonly logger = new Logger(AdminAuditRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'adminAuditLog');
  }

  /**
   * Admin audit logs are not tenant-aware as they are global to the system
   */
  protected isTenantAware(): boolean {
    return false;
  }

  /**
   * Convert metadata to Prisma JSON value
   */
  private convertMetadataToJson(
    metadata?: Record<string, unknown>,
  ): Prisma.InputJsonValue | undefined {
    if (!metadata) {
      return undefined;
    }
    return metadata as Prisma.InputJsonValue;
  }

  /**
   * Create a new audit log entry
   */
  async create(data: CreateAuditLogData): Promise<AdminAuditLog> {
    return this.executeQuery(
      () =>
        this.prisma.adminAuditLog.create({
          data: {
            userId: data.userId,
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId,
            metadata: this.convertMetadataToJson(data.metadata),
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        }),
      'Failed to create audit log',
    );
  }

  /**
   * Get audit logs for a specific user with pagination
   */
  async findByUser(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    return this.executeQuery(async () => {
      const [logs, total] = await Promise.all([
        this.prisma.adminAuditLog.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        this.prisma.adminAuditLog.count({
          where: { userId },
        }),
      ]);

      return { logs, total };
    }, 'Failed to get user audit logs');
  }

  /**
   * Get audit logs for a specific resource with pagination
   */
  async findByResource(
    resource: string,
    resourceId: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    return this.executeQuery(async () => {
      const where = {
        resource,
        ...(resourceId && { resourceId }),
      };

      const [logs, total] = await Promise.all([
        this.prisma.adminAuditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
        this.prisma.adminAuditLog.count({ where }),
      ]);

      return { logs, total };
    }, 'Failed to get resource audit logs');
  }
}
