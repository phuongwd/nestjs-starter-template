import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SystemMetrics } from '../interfaces/monitoring.interface';
import { SecurityAlert, AuditLog } from '@prisma/client';
import { MonitoringRepository } from '../repositories/monitoring.repository';

interface AlertThresholds {
  failedLoginAttempts: number;
  setupAttempts: number;
  suspiciousIPs: number;
}

/**
 * Service for system-wide monitoring and metrics
 * @description Handles monitoring, metrics collection, and alerting for system activities
 */
@Injectable()
export class SystemMonitoringService {
  private readonly logger = new Logger(SystemMonitoringService.name);
  private readonly alertThresholds: AlertThresholds;

  constructor(
    private readonly configService: ConfigService,
    private readonly monitoringRepository: MonitoringRepository,
  ) {
    this.alertThresholds = {
      failedLoginAttempts:
        this.configService.get<number>('monitoring.thresholds.failedLogins') ||
        5,
      setupAttempts:
        this.configService.get<number>('monitoring.thresholds.setupAttempts') ||
        3,
      suspiciousIPs:
        this.configService.get<number>('monitoring.thresholds.suspiciousIPs') ||
        2,
    };
  }

  /**
   * Collect system metrics
   * @returns Object containing various system metrics
   */
  async collectMetrics(): Promise<SystemMetrics> {
    return this.monitoringRepository.collectMetrics();
  }

  /**
   * Check for suspicious activities
   * @description Runs periodically to detect potential security issues
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkSuspiciousActivities(): Promise<void> {
    try {
      const metrics = await this.collectMetrics();

      // Check failed login attempts
      if (
        metrics.recentFailedLogins > this.alertThresholds.failedLoginAttempts
      ) {
        this.logger.warn(
          `High number of failed login attempts detected: ${metrics.recentFailedLogins}`,
        );
        await this.triggerAlert({
          type: 'HIGH_FAILED_LOGINS',
          details: this.metricsToRecord(metrics),
        });
      }

      // Check pending setup tokens
      if (metrics.pendingSetupTokens > this.alertThresholds.setupAttempts) {
        this.logger.warn(
          `Unusual number of pending setup tokens: ${metrics.pendingSetupTokens}`,
        );
        await this.triggerAlert({
          type: 'MULTIPLE_SETUP_ATTEMPTS',
          details: this.metricsToRecord(metrics),
        });
      }

      // Log metrics for monitoring
      this.logger.log('System metrics collected', metrics);
    } catch (error) {
      this.logger.error('Failed to check suspicious activities', error);
    }
  }

  /**
   * Gets paginated security alerts
   */
  async getSecurityAlerts(params: {
    skip: number;
    take: number;
    status?: string;
  }): Promise<[SecurityAlert[], number]> {
    return this.monitoringRepository.getSecurityAlerts(params);
  }

  /**
   * Gets paginated audit logs
   */
  async getAuditLogs(params: {
    skip: number;
    take: number;
    action?: string;
  }): Promise<[AuditLog[], number]> {
    return this.monitoringRepository.getAuditLogs(params);
  }

  /**
   * Triggers a security alert
   */
  async triggerAlert(params: {
    type: string;
    details: Record<string, unknown>;
    status?: string;
  }): Promise<SecurityAlert> {
    const { type, details, status = 'PENDING' } = params;
    this.logger.warn(`Security alert triggered: ${type}`);
    return this.monitoringRepository.createSecurityAlert({
      type,
      details,
      status,
    });
  }

  /**
   * Convert SystemMetrics to Record<string, unknown>
   * @param metrics The metrics to convert
   * @returns The metrics as a record
   */
  private metricsToRecord(metrics: SystemMetrics): Record<string, unknown> {
    return {
      totalUsers: metrics.totalUsers,
      activeAdminSessions: metrics.activeAdminSessions,
      pendingSetupTokens: metrics.pendingSetupTokens,
      recentFailedLogins: metrics.recentFailedLogins,
    };
  }
}
