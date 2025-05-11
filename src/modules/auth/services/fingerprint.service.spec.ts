import { Test, TestingModule } from '@nestjs/testing';
import {
  FingerprintService,
  RateLimitExceededError,
} from './fingerprint.service';
import { Request } from 'express';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

describe('FingerprintService', () => {
  let service: FingerprintService;
  let mockConfigService: Partial<jest.Mocked<ConfigService>>;
  let currentTime: number;

  // Mock request factory
  const createMockRequest = (
    userAgent = 'test-agent',
    ip = '127.0.0.1',
  ): Partial<Request> => ({
    headers: {
      'user-agent': userAgent,
    },
    ip,
    socket: {
      remoteAddress: ip,
    } as any,
  });

  beforeEach(async () => {
    currentTime = 1234567890000; // Fixed timestamp for tests
    jest.spyOn(Date, 'now').mockImplementation(() => currentTime);

    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'JWT_SECRET') {
          return 'test-salt';
        }
        if (key === 'AUTH_FINGERPRINT_MAX_ATTEMPTS') {
          return 5;
        }
        if (key === 'AUTH_FINGERPRINT_RESET_AFTER') {
          return 15 * 60 * 1000;
        }
        if (key === 'AUTH_FINGERPRINT_TIME_WINDOW') {
          return 5 * 60 * 1000;
        }
        return defaultValue;
      }),
      getOrThrow: jest
        .fn()
        .mockImplementation((key: string, defaultValue?: any) => {
          if (key === 'JWT_SECRET') {
            return 'test-salt';
          }
          const value = mockConfigService.get!(key, defaultValue);
          if (value === undefined && defaultValue === undefined) {
            throw new Error(
              `Test Error: Config key '${key}' not found and no default was provided to getOrThrow.`,
            );
          }
          return value;
        }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FingerprintService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: Logger,
          useValue: {
            debug: jest.fn(),
            error: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FingerprintService>(FingerprintService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('generateFingerprint', () => {
    it('should generate consistent fingerprint for same input', () => {
      const req = createMockRequest() as Request;
      const fingerprint1 = service.generateFingerprint(req);
      const fingerprint2 = service.generateFingerprint(req);
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should normalize IPv6 localhost to IPv4', () => {
      const req1 = createMockRequest('test-agent', '::1') as Request;
      const req2 = createMockRequest('test-agent', '127.0.0.1') as Request;
      expect(service.generateFingerprint(req1)).toBe(
        service.generateFingerprint(req2),
      );
    });

    it('should handle missing user agent', () => {
      const req = createMockRequest(undefined) as Request;
      expect(() => service.generateFingerprint(req)).not.toThrow();
    });

    it('should handle missing IP', () => {
      const req = createMockRequest('test-agent', undefined) as Request;
      expect(() => service.generateFingerprint(req)).not.toThrow();
    });

    it('should normalize case sensitivity in user agent', () => {
      const req1 = createMockRequest('TEST-AGENT') as Request;
      const req2 = createMockRequest('test-agent') as Request;
      const fingerprint1 = service.generateFingerprint(req1);
      const fingerprint2 = service.generateFingerprint(req2);
      expect(fingerprint1).toBe(fingerprint2);
    });

    it('should handle whitespace in inputs', () => {
      const req1 = createMockRequest('  test-agent  ') as Request;
      const req2 = createMockRequest('test-agent') as Request;
      expect(service.generateFingerprint(req1)).toBe(
        service.generateFingerprint(req2),
      );
    });

    it('should include time window in fingerprint', () => {
      const req = createMockRequest() as Request;
      const fingerprint1 = service.generateFingerprint(req);

      // Move time forward but within same window
      currentTime += 1000;
      const fingerprint2 = service.generateFingerprint(req);
      expect(fingerprint1).toBe(fingerprint2);

      // Move time forward to next window
      currentTime += 300000; // 5 minutes
      const fingerprint3 = service.generateFingerprint(req);
      expect(fingerprint1).not.toBe(fingerprint3);
    });

    it('should use salt in fingerprint generation', () => {
      // Specific setup for this test to provide different salts
      // First service instance
      mockConfigService.get!.mockImplementationOnce((key: string) =>
        key === 'JWT_SECRET' ? 'salt1' : undefined,
      );
      mockConfigService.getOrThrow!.mockImplementationOnce((key: string) => {
        if (key === 'JWT_SECRET') return 'salt1';
        throw new Error(
          `Unexpected key in getOrThrow mock for service1: ${key}`,
        );
      });
      const service1 = new FingerprintService(
        mockConfigService as any as ConfigService,
      );

      // Second service instance
      mockConfigService.get!.mockImplementationOnce((key: string) =>
        key === 'JWT_SECRET' ? 'salt2' : undefined,
      );
      mockConfigService.getOrThrow!.mockImplementationOnce((key: string) => {
        if (key === 'JWT_SECRET') return 'salt2';
        throw new Error(
          `Unexpected key in getOrThrow mock for service2: ${key}`,
        );
      });
      const service2 = new FingerprintService(
        mockConfigService as any as ConfigService,
      );

      const req = createMockRequest() as Request;
      const fingerprint1 = service1.generateFingerprint(req);
      const fingerprint2 = service2.generateFingerprint(req);

      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });

  describe('compareFingerprints', () => {
    const storedFingerprint = 'stored-fingerprint';
    const currentFingerprint = 'current-fingerprint';
    const ip = '127.0.0.1';

    it('should return true for matching fingerprints', () => {
      expect(
        service.compareFingerprints(storedFingerprint, storedFingerprint, ip),
      ).toBe(true);
    });

    it('should return false for non-matching fingerprints', () => {
      expect(
        service.compareFingerprints(storedFingerprint, currentFingerprint, ip),
      ).toBe(false);
    });

    it('should handle case-sensitive comparison', () => {
      expect(
        service.compareFingerprints(
          storedFingerprint,
          storedFingerprint.toUpperCase(),
          ip,
        ),
      ).toBe(false);
    });

    it('should track rate limits per IP', () => {
      // Make max attempts
      for (let i = 0; i < 5; i++) {
        service.compareFingerprints(storedFingerprint, currentFingerprint, ip);
      }

      // Next attempt should throw
      expect(() =>
        service.compareFingerprints(storedFingerprint, currentFingerprint, ip),
      ).toThrow(RateLimitExceededError);
    });

    it('should reset rate limit after timeout', () => {
      // Make max attempts
      for (let i = 0; i < 5; i++) {
        service.compareFingerprints(storedFingerprint, currentFingerprint, ip);
      }

      // Move time forward past reset window
      currentTime += 900000; // 15 minutes

      // Should allow attempts again
      expect(() =>
        service.compareFingerprints(storedFingerprint, currentFingerprint, ip),
      ).not.toThrow();
    });

    it('should not apply rate limiting if IP is not provided', () => {
      // Make more than max attempts without IP
      for (let i = 0; i < 10; i++) {
        expect(() =>
          service.compareFingerprints(storedFingerprint, currentFingerprint),
        ).not.toThrow();
      }
    });
  });

  describe('getMetrics', () => {
    it('should return correct metrics', () => {
      const ip1 = '1.1.1.1';
      const ip2 = '2.2.2.2';

      // Add some rate limits
      service.compareFingerprints('a', 'b', ip1);
      service.compareFingerprints('a', 'b', ip2);

      const metrics = service.getMetrics();
      expect(metrics.rateLimits).toBe(2);
    });
  });

  describe('integration tests', () => {
    it('should generate same fingerprint for requests with same normalized data', () => {
      const req1 = createMockRequest('TEST-AGENT', '127.0.0.1') as Request;
      const req2 = createMockRequest('test-agent', '::1') as Request;
      expect(service.generateFingerprint(req1)).toBe(
        service.generateFingerprint(req2),
      );
    });

    it('should generate different fingerprints for different user agents', () => {
      const req1 = createMockRequest('agent1') as Request;
      const req2 = createMockRequest('agent2') as Request;
      expect(service.generateFingerprint(req1)).not.toBe(
        service.generateFingerprint(req2),
      );
    });

    it('should generate different fingerprints for different IPs', () => {
      const req1 = createMockRequest('test-agent', '1.1.1.1') as Request;
      const req2 = createMockRequest('test-agent', '2.2.2.2') as Request;
      expect(service.generateFingerprint(req1)).not.toBe(
        service.generateFingerprint(req2),
      );
    });
  });
});
