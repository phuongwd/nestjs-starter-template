import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DomainRoutingMiddleware } from '../domain-routing.middleware';
import { CustomDomainService } from '../../services/custom-domain.service';
import { NotFoundException } from '@nestjs/common';
import { ORGANIZATION_HEADER } from '@shared/constants';

describe('DomainRoutingMiddleware', () => {
  let middleware: DomainRoutingMiddleware;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDomainService = {
    findByDomain: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DomainRoutingMiddleware,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CustomDomainService,
          useValue: mockDomainService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    middleware = module.get<DomainRoutingMiddleware>(DomainRoutingMiddleware);

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Default config value
    mockConfigService.get.mockReturnValue('localhost');
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should skip middleware for default domain', async () => {
    const req = {
      hostname: 'localhost',
      headers: {},
      [ORGANIZATION_HEADER]: undefined
    } as any;
    const res = {
      setHeader: jest.fn()
    } as any;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockDomainService.findByDomain).not.toHaveBeenCalled();
  });

  it('should use cached organization ID if available', async () => {
    const req = {
      hostname: 'test.example.com',
      headers: {},
      [ORGANIZATION_HEADER]: undefined
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();
    const organizationId = 1;

    mockCacheManager.get.mockResolvedValue(organizationId);

    await middleware.use(req, res, next);

    expect(req[ORGANIZATION_HEADER]).toBe(organizationId);
    expect(mockDomainService.findByDomain).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'test.example.com',
    );
  });

  it('should fetch and cache organization ID if not cached', async () => {
    const req = { hostname: 'test.example.com' } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();
    const organizationId = 1;

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findByDomain.mockResolvedValue({
      organizationId,
      status: 'VERIFIED',
    });

    await middleware.use(req, res, next);

    expect(req[ORGANIZATION_HEADER]).toBe(organizationId);
    expect(mockDomainService.findByDomain).toHaveBeenCalledWith(
      'test.example.com',
    );
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'domain:test.example.com',
      organizationId,
      3600000,
    );
    expect(next).toHaveBeenCalled();
  });

  it('should throw NotFoundException for non-existent domain', async () => {
    const req = { hostname: 'nonexistent.example.com' } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findByDomain.mockResolvedValue(null);

    await expect(middleware.use(req, res, next)).rejects.toThrow(
      NotFoundException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException for unverified domain', async () => {
    const req = { hostname: 'unverified.example.com' } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findByDomain.mockResolvedValue({
      organizationId: 1,
      status: 'PENDING',
    });

    await expect(middleware.use(req, res, next)).rejects.toThrow(
      NotFoundException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should set security headers', async () => {
    const req = { hostname: 'test.example.com' } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();
    const organizationId = 1;

    mockCacheManager.get.mockResolvedValue(organizationId);

    await middleware.use(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains',
    );
    expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'SAMEORIGIN');
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Content-Type-Options',
      'nosniff',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Referrer-Policy',
      'strict-origin-when-cross-origin',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'test.example.com',
    );
  });

  it('should handle errors gracefully', async () => {
    const req = { hostname: 'test.example.com' } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockRejectedValue(new Error('Cache error'));

    await expect(middleware.use(req, res, next)).rejects.toThrow('Cache error');
    expect(next).not.toHaveBeenCalled();
  });
});
