import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import {
  HealthCheckService,
  TimeoutError,
  HealthCheckResult,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { CHECK_DISK_SPACE } from './constants';
import { Logger } from '@nestjs/common';

// Mock DEFAULT_HEALTH_CONFIG to avoid actual delays
jest.mock('./interfaces/health-check.config', () => ({
  DEFAULT_HEALTH_CONFIG: {
    database: {
      maxRetries: 2,
      retryIntervalMs: 0, // No actual delay
      timeoutMs: 1, // Very small timeout
    },
    disk: {
      pathToCheck: '/',
      thresholdPercent: 90,
    },
    memory: {
      heapUsedThresholdMb: 512,
      rssThresholdMb: 1024,
    },
  },
}));

describe('HealthService', () => {
  let service: HealthService;
  let healthCheck: HealthCheckService;
  let prismaHealth: PrismaHealthIndicator;
  let diskSpaceChecker: jest.Mock;
  let logger: jest.SpyInstance;

  beforeEach(async () => {
    diskSpaceChecker = jest.fn();
    logger = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: PrismaHealthIndicator,
          useValue: {
            isHealthy: jest.fn(),
          },
        },
        {
          provide: CHECK_DISK_SPACE,
          useValue: diskSpaceChecker,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    healthCheck = module.get<HealthCheckService>(HealthCheckService);
    prismaHealth = module.get<PrismaHealthIndicator>(PrismaHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('quickCheck', () => {
    it('should return cached result if within interval', async () => {
      // Arrange
      const cachedResult = {
        status: 'ok' as const,
        timestamp: Date.now(),
        duration: '10ms',
      };
      service['lastQuickCheckResult'] = cachedResult;
      service['lastQuickCheckTime'] = Date.now();

      // Act
      const result = await service.quickCheck();

      // Assert
      expect(result).toBe(cachedResult);
      expect(prismaHealth.isHealthy).not.toHaveBeenCalled();
    });

    it('should perform new check if cache expired', async () => {
      // Arrange
      service['lastQuickCheckTime'] = Date.now() - 2000; // 2 seconds ago
      jest.spyOn(prismaHealth, 'isHealthy').mockResolvedValue({
        database: { status: 'up' },
      });

      // Act
      const result = await service.quickCheck();

      // Assert
      expect(result.status).toBe('ok');
      expect(prismaHealth.isHealthy).toHaveBeenCalled();
    });

    it('should handle database check errors', async () => {
      // Arrange
      jest
        .spyOn(prismaHealth, 'isHealthy')
        .mockRejectedValue(new Error('DB Error'));

      // Act
      const result = await service.quickCheck();

      // Assert
      expect(result.status).toBe('error');
      expect(result.error).toBe('DB Error');
    });
  });

  describe('checkAll', () => {
    it('should return cached result if within interval', async () => {
      // Arrange
      const cachedResult: HealthCheckResult = {
        status: 'ok',
        info: { test: { status: 'up' } },
        error: {},
        details: { test: { status: 'up' } },
      };
      service['lastCheckResult'] = {
        ...cachedResult,
        duration: '10ms',
      };
      service['lastCheckTime'] = Date.now();

      // Act
      const result = await service.checkAll();

      // Assert
      expect(result).toBe(service['lastCheckResult']);
      expect(healthCheck.check).not.toHaveBeenCalled();
    });

    it('should perform all health checks when cache expired', async () => {
      // Arrange
      service['lastCheckTime'] = Date.now() - 2000; // 2 seconds ago
      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          disk: { status: 'up' },
          memory: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          disk: { status: 'up' },
          memory: { status: 'up' },
        },
      };
      jest.spyOn(healthCheck, 'check').mockResolvedValue(mockHealthResult);

      // Act
      const result = await service.checkAll();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.info!.database).toBeDefined();
      expect(result.info!.disk).toBeDefined();
      expect(result.info!.memory).toBeDefined();
      expect(healthCheck.check).toHaveBeenCalled();
    });

    it('should handle database timeout with retry', async () => {
      // Arrange
      service['lastCheckTime'] = 0;
      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: { database: { status: 'up' } },
        error: {},
        details: { database: { status: 'up' } },
      };

      // Mock the health check service to execute the checks
      jest.spyOn(healthCheck, 'check').mockImplementation(async (checks) => {
        // Execute the first check (database check with retry)
        await checks[0]();
        return mockHealthResult;
      });

      // Mock the Prisma health indicator to fail once then succeed
      let dbCallCount = 0;
      jest.spyOn(prismaHealth, 'isHealthy').mockImplementation(async () => {
        dbCallCount++;
        if (dbCallCount === 1) {
          throw new TimeoutError(1, 'DB Timeout');
        }
        return { database: { status: 'up' } };
      });

      // Act
      const result = await service.checkAll();

      // Assert
      expect(result.status).toBe('ok');
      expect(prismaHealth.isHealthy).toHaveBeenCalledTimes(2);
      expect(result.info!.database.status).toBe('up');
    });

    it('should handle disk space check', async () => {
      // Arrange
      service['lastCheckTime'] = 0;
      diskSpaceChecker.mockResolvedValue({
        free: 50 * 1024 * 1024 * 1024, // 50GB
        size: 100 * 1024 * 1024 * 1024, // 100GB
      });

      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          disk: {
            status: 'up',
            details: {
              total: '100GB',
              free: '50GB',
              used: '50%',
            },
          },
        },
        error: {},
        details: {
          disk: {
            status: 'up',
            details: {
              total: '100GB',
              free: '50GB',
              used: '50%',
            },
          },
        },
      };
      jest.spyOn(healthCheck, 'check').mockResolvedValue(mockHealthResult);

      // Act
      const result = await service.checkAll();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.info!.disk.status).toBe('up');
      expect(result.info!.disk.details).toEqual({
        total: '100GB',
        free: '50GB',
        used: '50%',
      });
    });

    it('should handle memory check', async () => {
      // Arrange
      service['lastCheckTime'] = 0;
      const mockMemoryUsage = {
        heapUsed: 100 * 1024 * 1024, // 100MB
        rss: 200 * 1024 * 1024, // 200MB
      };
      jest
        .spyOn(process, 'memoryUsage')
        .mockReturnValue(mockMemoryUsage as any);

      const mockHealthResult: HealthCheckResult = {
        status: 'ok',
        info: {
          memory: {
            status: 'up',
            details: {
              heap: {
                used: '100MB',
                threshold: '512MB',
                status: 'ok',
              },
              rss: {
                used: '200MB',
                threshold: '1024MB',
                status: 'ok',
              },
            },
          },
        },
        error: {},
        details: {
          memory: {
            status: 'up',
            details: {
              heap: {
                used: '100MB',
                threshold: '512MB',
                status: 'ok',
              },
              rss: {
                used: '200MB',
                threshold: '1024MB',
                status: 'ok',
              },
            },
          },
        },
      };
      jest.spyOn(healthCheck, 'check').mockResolvedValue(mockHealthResult);

      // Act
      const result = await service.checkAll();

      // Assert
      expect(result.status).toBe('ok');
      expect(result.info!.memory.status).toBe('up');
      expect(result.info!.memory.details).toEqual({
        heap: {
          used: '100MB',
          threshold: '512MB',
          status: 'ok',
        },
        rss: {
          used: '200MB',
          threshold: '1024MB',
          status: 'ok',
        },
      });
    });

    it('should handle errors in health checks', async () => {
      // Arrange
      service['lastCheckTime'] = 0;
      const error = new Error('Health check failed');
      jest.spyOn(healthCheck, 'check').mockRejectedValue(error);

      // Act & Assert
      await expect(service.checkAll()).rejects.toThrow('Health check failed');
      expect(logger).toHaveBeenCalled();
      expect(service['lastCheckResult']).toBeNull();
    });
  });
});
