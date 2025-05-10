import { SecurityAlert, AuditLog } from '@prisma/client';
import { SystemMetrics } from './monitoring.interface';

/**
 * Repository interface for monitoring operations
 */
export interface IMonitoringRepository {
  /**
   * Collect system metrics
   */
  collectMetrics(): Promise<SystemMetrics>;

  /**
   * Get paginated security alerts
   */
  getSecurityAlerts(params: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<[SecurityAlert[], number]>;

  /**
   * Get paginated audit logs
   */
  getAuditLogs(params: {
    skip: number;
    take: number;
    action?: string;
  }): Promise<[AuditLog[], number]>;

  /**
   * Create security alert
   */
  createSecurityAlert(params: {
    type: string;
    details: Record<string, unknown>;
    status: string;
  }): Promise<SecurityAlert>;
}
