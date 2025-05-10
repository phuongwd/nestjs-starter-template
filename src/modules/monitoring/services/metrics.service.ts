import { Injectable } from '@nestjs/common';
import { IMetricsService } from '../interfaces/metrics.interface';
import { MetricsResponseDto } from '../dtos/metrics.response.dto';
import { HealthResponseDto, HealthStatus } from '../dtos/health.response.dto';
import { PermissionCheckerService } from '@shared/services/permission-checker.service';

@Injectable()
export class MetricsService implements IMetricsService {
  // Define health thresholds
  private readonly SLOW_CHECK_THRESHOLD = 100; // ms
  private readonly HIGH_ERROR_RATE = 0.05; // 5%
  private readonly LOW_CACHE_HIT_RATE = 0.7; // 70%

  constructor(private readonly permissionChecker: PermissionCheckerService) {}

  getMetrics(): MetricsResponseDto {
    const metrics = this.permissionChecker.getMetrics();
    return {
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses,
      totalChecks: metrics.totalChecks,
      errors: metrics.errors,
      averageCheckTime: metrics.averageCheckTime,
      totalCheckTime: metrics.totalCheckTime,
      systemAdminBypasses: metrics.systemAdminBypasses,
      cacheHitRate: metrics.cacheHitRate,
    };
  }

  getHealth(): HealthResponseDto {
    const metrics = this.permissionChecker.getMetrics();

    // Calculate health indicators
    const errorRate = metrics.totalChecks
      ? metrics.errors / metrics.totalChecks
      : 0;
    const cacheHitRate = metrics.totalChecks
      ? metrics.cacheHits / metrics.totalChecks
      : 0;

    // Determine system health
    let status: HealthStatus = 'healthy';
    if (
      metrics.averageCheckTime > this.SLOW_CHECK_THRESHOLD ||
      errorRate > this.HIGH_ERROR_RATE ||
      cacheHitRate < this.LOW_CACHE_HIT_RATE
    ) {
      status = 'degraded';
    }
    if (errorRate > this.HIGH_ERROR_RATE * 2) {
      status = 'unhealthy';
    }

    return {
      status,
      performance: {
        averageCheckTime: metrics.averageCheckTime,
        cacheHitRate: metrics.cacheHitRate,
      },
      errors: metrics.errors,
      lastCheck: new Date().toISOString(),
    };
  }
}
