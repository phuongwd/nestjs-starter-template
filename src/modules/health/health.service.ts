import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  TimeoutError,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { DEFAULT_HEALTH_CONFIG } from './interfaces/health-check.config';
import { CheckDiskSpaceFunction } from './interfaces/check-disk-space.interface';
import { CHECK_DISK_SPACE } from './constants';

interface ExtendedHealthCheckResult extends HealthCheckResult {
  duration?: string;
}

interface QuickCheckResult {
  status: 'ok' | 'error' | 'checking';
  timestamp: number;
  duration?: string;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private lastCheckTime: number = 0;
  private lastCheckResult: ExtendedHealthCheckResult | null = null;
  private lastQuickCheckTime: number = 0;
  private lastQuickCheckResult: QuickCheckResult | null = null;
  private readonly CHECK_INTERVAL = 1000; // 1 second
  private isQuickChecking = false;

  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaHealth: PrismaHealthIndicator,
    @Inject(CHECK_DISK_SPACE)
    private readonly diskSpaceChecker: CheckDiskSpaceFunction,
  ) {}

  private async checkDiskSpace(): Promise<HealthIndicatorResult> {
    try {
      const { pathToCheck, thresholdPercent } = DEFAULT_HEALTH_CONFIG.disk;
      const diskInfo = await this.diskSpaceChecker(pathToCheck);
      const usedPercent =
        ((diskInfo.size - diskInfo.free) / diskInfo.size) * 100;

      return {
        disk: {
          status: usedPercent < thresholdPercent ? 'up' : 'down',
          details: {
            total: `${Math.round(diskInfo.size / 1024 / 1024 / 1024)}GB`,
            free: `${Math.round(diskInfo.free / 1024 / 1024 / 1024)}GB`,
            used: `${Math.round(usedPercent)}%`,
          },
        },
      };
    } catch (error) {
      this.logger.error('Disk space check failed:', error);
      return {
        disk: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private async checkMemory(): Promise<HealthIndicatorResult> {
    try {
      const { heapUsedThresholdMb, rssThresholdMb } =
        DEFAULT_HEALTH_CONFIG.memory;
      const { heapUsed, rss } = process.memoryUsage();

      const heapUsedMb = Math.round(heapUsed / 1024 / 1024);
      const rssMb = Math.round(rss / 1024 / 1024);

      const isHeapHealthy = heapUsedMb < heapUsedThresholdMb;
      const isRssHealthy = rssMb < rssThresholdMb;

      return {
        memory: {
          status: isHeapHealthy && isRssHealthy ? 'up' : 'down',
          details: {
            heap: {
              used: `${heapUsedMb}MB`,
              threshold: `${heapUsedThresholdMb}MB`,
              status: isHeapHealthy ? 'ok' : 'warning',
            },
            rss: {
              used: `${rssMb}MB`,
              threshold: `${rssThresholdMb}MB`,
              status: isRssHealthy ? 'ok' : 'warning',
            },
          },
        },
      };
    } catch (error) {
      this.logger.error('Memory check failed:', error);
      return {
        memory: {
          status: 'down',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async quickCheck(): Promise<QuickCheckResult> {
    const now = Date.now();

    // Return cached result if within interval and not currently checking
    if (
      !this.isQuickChecking &&
      this.lastQuickCheckResult &&
      now - this.lastQuickCheckTime < this.CHECK_INTERVAL
    ) {
      return this.lastQuickCheckResult;
    }

    // Prevent concurrent checks
    if (this.isQuickChecking) {
      return (
        this.lastQuickCheckResult || { status: 'checking', timestamp: now }
      );
    }

    this.isQuickChecking = true;
    const startTime = now;

    try {
      // Use the database health indicator for a quick check
      await this.prismaHealth.isHealthy('database');

      const duration = Date.now() - startTime;
      this.lastQuickCheckResult = {
        status: 'ok',
        timestamp: now,
        duration: `${duration}ms`,
      };
    } catch (error) {
      this.lastQuickCheckResult = {
        status: 'error',
        timestamp: now,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    } finally {
      this.lastQuickCheckTime = now;
      this.isQuickChecking = false;
    }

    return this.lastQuickCheckResult;
  }

  async checkAll(): Promise<ExtendedHealthCheckResult> {
    const now = Date.now();

    // Return cached result if within interval
    if (
      this.lastCheckResult &&
      now - this.lastCheckTime < this.CHECK_INTERVAL
    ) {
      return this.lastCheckResult;
    }

    const startTime = now;
    try {
      const result = await this.health.check([
        // Database health check with retry
        async () => {
          let lastError: Error | null = null;
          for (let i = 0; i < DEFAULT_HEALTH_CONFIG.database.maxRetries; i++) {
            try {
              return await this.prismaHealth.isHealthy('database');
            } catch (error) {
              lastError = error as Error;
              if (error instanceof TimeoutError) {
                await new Promise((resolve) =>
                  setTimeout(
                    resolve,
                    DEFAULT_HEALTH_CONFIG.database.retryIntervalMs,
                  ),
                );
                continue;
              }
              throw error;
            }
          }
          throw lastError;
        },
        // Disk space check
        async () => this.checkDiskSpace(),
        // Memory check
        async () => this.checkMemory(),
      ]);

      const duration = Date.now() - startTime;
      this.logger.debug(`Health check completed in ${duration}ms`);

      // Cache successful results
      this.lastCheckTime = now;
      this.lastCheckResult = {
        ...result,
        duration: `${duration}ms`,
      };

      return this.lastCheckResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Health check failed after ${duration}ms:`,
        error instanceof Error ? error.message : error,
      );

      // Don't cache errors
      this.lastCheckResult = null;

      throw error;
    }
  }
}
