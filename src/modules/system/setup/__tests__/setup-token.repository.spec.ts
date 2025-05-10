import { Test, TestingModule } from '@nestjs/testing';
import { SetupTokenRepository } from '../repositories/setup-token.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  CreateSetupTokenData,
  CreateSetupAuditData,
} from '../interfaces/setup-token.interface';

describe('SetupTokenRepository', () => {
  let repository: SetupTokenRepository;

  type TransactionCallback<TResult> = (
    tx: MockPrismaService,
  ) => Promise<TResult>;

  interface MockPrismaService {
    setupToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    setupAudit: {
      create: jest.Mock;
    };
    $transaction: <TResult>(
      callback: TransactionCallback<TResult>,
    ) => Promise<TResult>;
  }

  const mockPrismaService: MockPrismaService = {
    setupToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    setupAudit: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupTokenRepository,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    repository = module.get<SetupTokenRepository>(SetupTokenRepository);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('createToken', () => {
    const mockData: CreateSetupTokenData = {
      token: 'test-token',
      environment: 'development',
      expiresAt: new Date(),
      createdByIp: '127.0.0.1',
      fingerprint: 'test-fingerprint',
      metadata: { source: 'test' },
    };

    it('should create a valid token', async () => {
      const mockToken = {
        id: '1',
        ...mockData,
        isUsed: false,
        createdAt: new Date(),
      };

      mockPrismaService.setupToken.create.mockResolvedValue(mockToken);

      const result = await repository.createToken(mockData);

      expect(result).toEqual(mockToken);
      expect(mockPrismaService.setupToken.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: mockData.token,
          environment: mockData.environment,
          expiresAt: expect.any(Date),
          createdByIp: mockData.createdByIp,
          fingerprint: mockData.fingerprint,
          metadata: mockData.metadata,
          isUsed: false,
        }),
      });
    });

    it('should throw error when token creation fails', async () => {
      mockPrismaService.setupToken.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(repository.createToken(mockData)).rejects.toThrow(
        'Creation failed',
      );
    });
  });

  describe('findByToken', () => {
    const mockToken = 'test-token';

    it('should find token by value', async () => {
      const mockTokenData = {
        id: '1',
        token: mockToken,
        environment: 'development',
        isUsed: false,
        expiresAt: new Date(),
      };

      mockPrismaService.setupToken.findUnique.mockResolvedValue(mockTokenData);

      const result = await repository.findByToken(mockToken);

      expect(result).toEqual(mockTokenData);
      expect(mockPrismaService.setupToken.findUnique).toHaveBeenCalledWith({
        where: { token: mockToken },
      });
    });

    it('should return null for non-existent token', async () => {
      mockPrismaService.setupToken.findUnique.mockResolvedValue(null);

      const result = await repository.findByToken(mockToken);

      expect(result).toBeNull();
    });
  });

  describe('markAsUsed', () => {
    const mockId = '1';
    const mockIp = '127.0.0.1';

    it('should mark token as used', async () => {
      const mockTokenData = {
        id: mockId,
        isUsed: true,
        usedAt: expect.any(Date),
        usedByIp: mockIp,
      };

      mockPrismaService.setupToken.update.mockResolvedValue(mockTokenData);

      const result = await repository.markAsUsed(mockId, mockIp);

      expect(result).toEqual(mockTokenData);
      expect(mockPrismaService.setupToken.update).toHaveBeenCalledWith({
        where: { id: mockId },
        data: expect.objectContaining({
          isUsed: true,
          usedAt: expect.any(Date),
          usedByIp: mockIp,
        }),
      });
    });

    it('should throw error when update fails', async () => {
      mockPrismaService.setupToken.update.mockRejectedValue(
        new Error('Update failed'),
      );

      await expect(repository.markAsUsed(mockId, mockIp)).rejects.toThrow(
        'Update failed',
      );
    });
  });

  describe('createAuditEntry', () => {
    const mockData: CreateSetupAuditData = {
      tokenId: '1',
      action: 'TEST_ACTION',
      ip: '127.0.0.1',
      success: true,
      error: undefined,
      metadata: { test: 'data' },
    };

    it('should create audit entry', async () => {
      const mockAuditEntry = {
        id: '1',
        ...mockData,
        timestamp: expect.any(Date),
      };

      mockPrismaService.setupAudit.create.mockResolvedValue(mockAuditEntry);

      const result = await repository.createAuditEntry(mockData);

      expect(result).toEqual(mockAuditEntry);
      expect(mockPrismaService.setupAudit.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          token: { connect: { id: mockData.tokenId } },
          action: mockData.action,
          ip: mockData.ip,
          success: mockData.success,
          error: mockData.error,
          metadata: mockData.metadata,
          timestamp: expect.any(Date),
        }),
      });
    });

    it('should throw error when audit creation fails', async () => {
      mockPrismaService.setupAudit.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(repository.createAuditEntry(mockData)).rejects.toThrow(
        'Creation failed',
      );
    });
  });
});
