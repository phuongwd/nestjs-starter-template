import { Injectable, Logger, Inject } from '@nestjs/common';
import { AdminAuditLog } from '@prisma/client';
import { RequestWithUser } from '@/modules/auth/types/user.types';
import { IAdminAuditRepository } from '../interfaces/admin-audit.repository.interface';
import { INJECTION_TOKENS } from '@/modules/admin/shared/constants/injection-tokens';

/**
 * Service for logging admin actions
 * Provides audit trail for all administrative operations
 */
@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    @Inject(INJECTION_TOKENS.REPOSITORY.ADMIN_AUDIT)
    private readonly auditRepository: IAdminAuditRepository,
  ) {}

  /**
   * Log an admin action
   */
  async logAction(options: {
    userId: number;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AdminAuditLog> {
    try {
      const log = await this.auditRepository.create(options);

      this.logger.debug(
        `Audit log created: ${options.action} on ${options.resource}`,
        {
          userId: options.userId,
          resourceId: options.resourceId,
        },
      );

      return log;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      this.logger.error(
        `Failed to create audit log: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Log an admin action from a request
   */
  async logActionFromRequest(
    request: RequestWithUser,
    action: string,
    resource: string,
    resourceId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<AdminAuditLog> {
    if (!request.user) {
      throw new Error('User not found in request');
    }

    return this.logAction({
      userId: request.user.id,
      action,
      resource,
      resourceId,
      metadata,
      ipAddress: this.getClientIp(request),
      userAgent: request.headers['user-agent'],
    });
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserAuditLogs(
    userId: number,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    return this.auditRepository.findByUser(userId, page, limit);
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(
    resource: string,
    resourceId?: string,
    page = 1,
    limit = 20,
  ): Promise<{ logs: AdminAuditLog[]; total: number }> {
    return this.auditRepository.findByResource(
      resource,
      resourceId,
      page,
      limit,
    );
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: RequestWithUser): string {
    return (
      (request.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      request.ip ||
      'unknown'
    );
  }
}
