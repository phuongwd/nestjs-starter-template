import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SecurityAlert, AuditLog, Prisma } from '@prisma/client';
import { IMonitoringRepository } from '../interfaces/monitoring-repository.interface';
import { SystemMetrics } from '../interfaces/monitoring.interface';
import { BaseRepository } from '@/shared/repositories/base.repository';

/**
 * Repository implementation for monitoring operations
 */
@Injectable()
export class MonitoringRepository
  extends BaseRepository<SecurityAlert>
  implements IMonitoringRepository
{
  protected override readonly logger = new Logger(MonitoringRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'securityAlert');
  }

  protected isTenantAware(): boolean {
    return false;
  }

  async collectMetrics(): Promise<SystemMetrics> {
    return this.executeQuery(async () => {
      const [
        totalUsers,
        activeAdminSessions,
        pendingSetupTokens,
        recentFailedLogins,
      ] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.adminSession.count({
          where: { expiresAt: { gt: new Date() } },
        }),
        this.prisma.setupToken.count({
          where: { expiresAt: { gt: new Date() } },
        }),
        this.prisma.auditLog.count({
          where: {
            action: 'LOGIN_FAILED',
            timestamp: { gt: new Date(Date.now() - 3600000) }, // Last hour
          },
        }),
      ]);

      return {
        totalUsers,
        activeAdminSessions,
        pendingSetupTokens,
        recentFailedLogins,
      };
    }, 'Failed to collect system metrics');
  }

  async getSecurityAlerts(params: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<[SecurityAlert[], number]> {
    const { skip, take, status } = params;
    const where = status ? { status } : {};

    return this.executeQuery(async () => {
      const [alerts, total] = await Promise.all([
        this.prisma.securityAlert.findMany({
          where,
          skip,
          take,
          orderBy: { created_at: 'desc' },
        }),
        this.prisma.securityAlert.count({ where }),
      ]);
      return [alerts, total];
    }, 'Failed to fetch security alerts');
  }

  async getAuditLogs(params: {
    skip: number;
    take: number;
    action?: string;
  }): Promise<[AuditLog[], number]> {
    const { skip, take, action } = params;
    const where = action ? { action } : {};

    return this.executeQuery(async () => {
      const [logs, total] = await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          skip,
          take,
          orderBy: { timestamp: 'desc' },
          include: { users: true },
        }),
        this.prisma.auditLog.count({ where }),
      ]);
      return [logs, total];
    }, 'Failed to fetch audit logs');
  }

  async createSecurityAlert(params: {
    type: string;
    details: Record<string, unknown>;
    status: string;
  }): Promise<SecurityAlert> {
    const { type, details, status } = params;
    const now = new Date();

    return this.executeQuery(async () => {
      return this.prisma.securityAlert.create({
        data: {
          type,
          details: details as Prisma.InputJsonValue,
          status,
          created_at: now,
          updated_at: now,
        },
      });
    }, 'Failed to create security alert');
  }
}
