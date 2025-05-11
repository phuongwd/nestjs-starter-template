import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { DomainRoutingMiddleware } from '../domain-routing.middleware';
import { CustomDomainService } from '../../services/custom-domain.service';
import { ORGANIZATION_HEADER } from '@shared/constants';

describe('DomainRoutingMiddleware', () => {
  let middleware: DomainRoutingMiddleware;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDomainService = {
    findByDomain: jest.fn(),
    findOrganizationIdByDomain: jest.fn(),
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
      path: '/',
      ip: '127.0.0.1',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(mockDomainService.findByDomain).not.toHaveBeenCalled();
  });

  it('should use cached organization ID if available', async () => {
    const req = {
      hostname: 'test.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();
    const organizationId = 1;

    mockCacheManager.get.mockResolvedValue(organizationId);

    await middleware.use(req, res, next);

    expect(req[ORGANIZATION_HEADER]).toBe(organizationId);
    expect(mockDomainService.findOrganizationIdByDomain).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'test.example.com',
    );
  });

  it('should fetch and cache organization ID if not cached', async () => {
    const req = {
      hostname: 'test.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();
    const organizationId = 1;

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findOrganizationIdByDomain.mockResolvedValue(
      organizationId,
    );

    await middleware.use(req, res, next);

    expect(req[ORGANIZATION_HEADER]).toBe(organizationId);
    expect(mockDomainService.findOrganizationIdByDomain).toHaveBeenCalledWith(
      'test.example.com',
    );
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'domain:test.example.com',
      organizationId,
      3600000,
    );
    expect(next).toHaveBeenCalled();
  });

  it('should use default organization for non-existent domain', async () => {
    const req = {
      hostname: 'nonexistent.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findOrganizationIdByDomain.mockResolvedValue(null);

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req[ORGANIZATION_HEADER]).toBe(1);
    expect(mockDomainService.findOrganizationIdByDomain).toHaveBeenCalledWith(
      'nonexistent.example.com',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'nonexistent.example.com',
    );
  });

  it('should use default organization for unverified domain (if service returns null)', async () => {
    const req = {
      hostname: 'unverified.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockResolvedValue(null);
    mockDomainService.findOrganizationIdByDomain.mockResolvedValue(null);

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req[ORGANIZATION_HEADER]).toBe(1);
    expect(mockDomainService.findOrganizationIdByDomain).toHaveBeenCalledWith(
      'unverified.example.com',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'unverified.example.com',
    );
  });

  it('should use default organization if cache lookup fails and domain lookup also fails', async () => {
    const req = {
      hostname: 'test.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
    mockDomainService.findOrganizationIdByDomain.mockResolvedValue(null);

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req[ORGANIZATION_HEADER]).toBe(1);
    expect(mockDomainService.findOrganizationIdByDomain).toHaveBeenCalledWith(
      'test.example.com',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'test.example.com',
    );
  });

  it('should set security headers', async () => {
    const req = {
      hostname: 'test.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
    } as any;
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
    const req = {
      hostname: 'test.example.com',
      path: '/',
      ip: '8.8.8.8',
      originalUrl: '/',
      headers: {},
      [ORGANIZATION_HEADER]: undefined,
    } as any;
    const res = {
      setHeader: jest.fn(),
    } as any;
    const next = jest.fn();

    mockCacheManager.get.mockRejectedValue(new Error('Cache error'));
    mockDomainService.findOrganizationIdByDomain.mockResolvedValue(null);

    await middleware.use(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req[ORGANIZATION_HEADER]).toBe(1);
    expect(mockDomainService.findOrganizationIdByDomain).toHaveBeenCalledWith(
      'test.example.com',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-Organization-Domain',
      'test.example.com',
    );
  });
});
