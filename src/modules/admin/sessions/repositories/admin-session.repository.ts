import { Injectable, Logger } from '@nestjs/common';
import { AdminSession } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { BaseRepository } from '@/shared/repositories/base.repository';
import { IAdminSessionRepository } from '../interfaces/admin-session.repository.interface';

interface CreateSessionData {
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

/**
 * Repository for managing admin sessions
 */
@Injectable()
export class AdminSessionRepository
  extends BaseRepository<AdminSession>
  implements IAdminSessionRepository
{
  protected readonly logger = new Logger(AdminSessionRepository.name);

  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'adminSession');
  }

  /**
   * Admin sessions are not tenant-aware as they are global to the system
   */
  protected isTenantAware(): boolean {
    return false;
  }

  /**
   * Create a new admin session
   */
  async create(data: CreateSessionData): Promise<AdminSession> {
    return this.executeQuery(
      () =>
        this.prisma.adminSession.create({
          data: {
            userId: data.userId,
            token: data.token,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
            expiresAt: data.expiresAt,
          },
        }),
      'Failed to create admin session',
    );
  }

  /**
   * Find a session by token
   */
  async findByToken(token: string): Promise<AdminSession | null> {
    return this.executeQuery(
      () =>
        this.prisma.adminSession.findUnique({
          where: { token },
        }),
      'Failed to find admin session by token',
    );
  }

  /**
   * Find active sessions for a user
   */
  async findActiveByUserId(userId: number): Promise<AdminSession[]> {
    return this.executeQuery(
      () =>
        this.prisma.adminSession.findMany({
          where: {
            userId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
          orderBy: { lastActivity: 'desc' },
        }),
      'Failed to find active admin sessions for user',
    );
  }

  /**
   * Update session activity timestamp
   */
  async updateActivity(id: number): Promise<AdminSession> {
    return this.executeQuery(
      () =>
        this.prisma.adminSession.update({
          where: { id },
          data: { lastActivity: new Date() },
        }),
      'Failed to update admin session activity',
    );
  }

  /**
   * Revoke a session
   */
  async revoke(token: string): Promise<void> {
    await this.executeQuery(
      () =>
        this.prisma.adminSession.update({
          where: { token },
          data: { revokedAt: new Date() },
        }),
      'Failed to revoke admin session',
    );
  }

  /**
   * Delete expired and revoked sessions
   */
  async deleteExpiredAndRevoked(): Promise<number> {
    const result = await this.executeQuery(
      () =>
        this.prisma.adminSession.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: new Date() } },
              { revokedAt: { not: null } },
            ],
          },
        }),
      'Failed to delete expired and revoked sessions',
    );

    return result.count;
  }
}
