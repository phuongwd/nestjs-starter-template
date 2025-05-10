import { Injectable, Logger } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
  TimeoutError,
} from '@nestjs/terminus';
import { PrismaService } from '../../../prisma/prisma.service';
import { DEFAULT_HEALTH_CONFIG } from '../interfaces/health-check.config';
import * as net from 'net';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);
  private lastCheckTime: number = 0;
  private lastCheckResult: HealthIndicatorResult | null = null;
  private readonly CHECK_INTERVAL = 1000; // 1 second
  private readonly dbConfig: { host: string; port: number };

  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {
    super();
    // Parse DATABASE_URL to get host and port
    const dbUrl = this.configService.get<string>('DATABASE_URL', '');
    const matches = dbUrl.match(/postgresql:\/\/.*@([^:]+):(\d+)\//);
    this.dbConfig = {
      host: matches?.[1] || 'postgres',
      port: parseInt(matches?.[2] || '5432', 10),
    };
  }

  private checkTcpConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new net.Socket();
      const timeout = setTimeout(() => {
        socket.destroy();
        reject(new Error('TCP connection timeout'));
      }, DEFAULT_HEALTH_CONFIG.database.timeoutMs);

      socket.connect(this.dbConfig.port, this.dbConfig.host, () => {
        clearTimeout(timeout);
        socket.end();
        resolve();
      });

      socket.on('error', (error) => {
        clearTimeout(timeout);
        socket.destroy();
        reject(error);
      });
    });
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
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
      // First try TCP connection
      await this.checkTcpConnection();

      // If TCP succeeds, do a quick query to verify database is responding
      const timeout = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new TimeoutError(
                DEFAULT_HEALTH_CONFIG.database.timeoutMs,
                'Database connection timeout',
              ),
            ),
          DEFAULT_HEALTH_CONFIG.database.timeoutMs,
        ),
      );

      const query = this.prismaService.$executeRaw`SELECT 1 WHERE 1=1;`;
      await Promise.race([query, timeout]);

      const duration = Date.now() - startTime;
      this.logger.debug(`Database health check completed in ${duration}ms`);

      // Cache the result
      this.lastCheckTime = now;
      this.lastCheckResult = this.getStatus(key, true, {
        responseTime: `${duration}ms`,
      });

      return this.lastCheckResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Database health check failed after ${duration}ms:`,
        error instanceof Error ? error.message : error,
      );

      // Don't cache errors
      this.lastCheckResult = null;

      throw new HealthCheckError(
        'Prisma check failed',
        this.getStatus(key, false, {
          message:
            error instanceof TimeoutError
              ? 'Database query timed out'
              : error instanceof Error
                ? error.message
                : 'Unknown error',
          duration: `${duration}ms`,
        }),
      );
    }
  }
}
