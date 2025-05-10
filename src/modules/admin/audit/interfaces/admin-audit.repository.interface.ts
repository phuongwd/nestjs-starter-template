import { AdminAuditLog } from '@prisma/client';

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
 * Interface for admin audit log repository operations
 */
export interface IAdminAuditRepository {
  /**
   * Create a new audit log entry
   */
  create(data: CreateAuditLogData): Promise<AdminAuditLog>;

  /**
   * Get audit logs for a specific user with pagination
   */
  findByUser(
    userId: number,
    page: number,
    limit: number,
  ): Promise<{ logs: AdminAuditLog[]; total: number }>;

  /**
   * Get audit logs for a specific resource with pagination
   */
  findByResource(
    resource: string,
    resourceId: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ logs: AdminAuditLog[]; total: number }>;
}
