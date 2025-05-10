import { Test, TestingModule } from '@nestjs/testing';
import { SetupService } from '../services/setup.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { SetupCompletionData } from '../interfaces/setup-service.interface';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import {
  SetupToken,
  SetupAudit,
  Prisma,
  User,
  SystemRole,
} from '@prisma/client';
import { ISetupTokenRepository } from '../interfaces/setup-token.interface';
import { SETUP_TOKENS } from '../constants/setup.constants';

describe('SetupService', () => {
  let service: SetupService;

  const mockSetupTokenRepository: jest.Mocked<ISetupTokenRepository> = {
    createToken: jest.fn(),
    findByToken: jest.fn(),
    markAsUsed: jest.fn(),
    createAuditEntry: jest.fn(),
  };

  interface MockPrismaService {
    $transaction: <T>(
      callback: (tx: MockPrismaService) => Promise<T>,
    ) => Promise<T>;
    user: {
      create: jest.Mock<Promise<User>, [{ data: any }]>;
    };
    systemRole: {
      create: jest.Mock<Promise<SystemRole>, [{ data: any }]>;
      count: jest.Mock<Promise<number>, [{ where: any }]>;
    };
  }

  const mockPrismaService: MockPrismaService = {
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
    user: {
      create: jest.fn(),
    },
    systemRole: {
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: SETUP_TOKENS.REPOSITORY.SETUP_TOKEN,
          useValue: mockSetupTokenRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SetupService,
          useFactory: (
            prisma: PrismaService,
            config: ConfigService,
            repository: ISetupTokenRepository,
          ) => new SetupService(prisma, config, repository),
          inject: [
            PrismaService,
            ConfigService,
            SETUP_TOKENS.REPOSITORY.SETUP_TOKEN,
          ],
        },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    const mockIp = '127.0.0.1';
    const mockFingerprint = 'test-fingerprint';

    it('should generate a token successfully', async () => {
      const mockToken: SetupToken = {
        id: '1',
        token: 'test-token',
        environment: 'development',
        expiresAt: new Date(),
        createdAt: new Date(),
        createdByIp: mockIp,
        fingerprint: mockFingerprint,
        isUsed: false,
        usedAt: null,
        usedByIp: null,
        metadata: { source: 'api' },
      };

      mockConfigService.get.mockReturnValue('development');
      mockSetupTokenRepository.createToken.mockResolvedValue(mockToken);
      mockSetupTokenRepository.createAuditEntry.mockResolvedValue(
        {} as SetupAudit,
      );

      const result = await service.generateToken(mockIp, mockFingerprint);

      expect(result).toBe(mockToken);
      expect(mockSetupTokenRepository.createToken).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByIp: mockIp,
          fingerprint: mockFingerprint,
          environment: 'development',
        }),
      );
    });

    it('should throw error when token generation fails', async () => {
      mockSetupTokenRepository.createToken.mockRejectedValue(
        new Error('Token generation failed'),
      );

      await expect(service.generateToken(mockIp)).rejects.toThrow(
        'Token generation failed',
      );
    });
  });

  describe('completeSetup', () => {
    const mockIp = '127.0.0.1';
    const mockSetupData: SetupCompletionData = {
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
      setupToken: 'test-token',
      metadata: { source: 'test' },
    };

    const mockToken: SetupToken = {
      id: '1',
      token: mockSetupData.setupToken,
      environment: 'development',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour in future
      createdAt: new Date(),
      createdByIp: mockIp,
      fingerprint: null,
      isUsed: false,
      usedAt: null,
      usedByIp: null,
      metadata: null,
    };

    const mockUser: User = {
      id: 1,
      email: mockSetupData.email,
      password: mockSetupData.password,
      firstName: mockSetupData.firstName,
      lastName: mockSetupData.lastName,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: null,
      providerId: null,
      picture: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    };

    const mockSystemRole: SystemRole = {
      id: 1,
      name: 'SYSTEM_ADMIN',
      description: 'System Administrator',
      permissions: ['*'] as unknown as Prisma.JsonValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should complete setup successfully', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue(mockToken);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.systemRole.create.mockResolvedValue(mockSystemRole);
      mockSetupTokenRepository.markAsUsed.mockResolvedValue({} as SetupToken);
      mockSetupTokenRepository.createAuditEntry.mockResolvedValue(
        {} as SetupAudit,
      );

      await service.completeSetup(mockSetupData, mockIp);

      expect(mockSetupTokenRepository.findByToken).toHaveBeenCalledWith(
        mockSetupData.setupToken,
      );
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: mockSetupData.email,
          password: mockSetupData.password,
          firstName: mockSetupData.firstName,
          lastName: mockSetupData.lastName,
        }),
      });
    });

    it('should throw error for invalid token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue(null);

      await expect(
        service.completeSetup(mockSetupData, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for used token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue({
        ...mockToken,
        isUsed: true,
      });

      await expect(
        service.completeSetup(mockSetupData, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error for expired token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue({
        ...mockToken,
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in past
      });

      await expect(
        service.completeSetup(mockSetupData, mockIp),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw error when setup fails', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue(mockToken);
      mockPrismaService.user.create.mockRejectedValue(
        new Error('Creation failed'),
      );

      await expect(
        service.completeSetup(mockSetupData, mockIp),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('isSetupRequired', () => {
    it('should return true when no admin exists', async () => {
      mockPrismaService.systemRole.count.mockResolvedValue(0);

      const result = await service.isSetupRequired();

      expect(result).toBe(true);
      expect(mockPrismaService.systemRole.count).toHaveBeenCalledWith({
        where: { name: 'SYSTEM_ADMIN' },
      });
    });

    it('should return false when admin exists', async () => {
      mockPrismaService.systemRole.count.mockResolvedValue(1);

      const result = await service.isSetupRequired();

      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    const mockToken = 'test-token';
    const mockIp = '127.0.0.1';

    it('should return true for valid token', async () => {
      const mockTokenData: SetupToken = {
        id: '1',
        token: mockToken,
        environment: 'development',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour in future
        createdAt: new Date(),
        createdByIp: mockIp,
        fingerprint: null,
        isUsed: false,
        usedAt: null,
        usedByIp: null,
        metadata: null,
      };

      mockSetupTokenRepository.findByToken.mockResolvedValue(mockTokenData);
      mockSetupTokenRepository.createAuditEntry.mockResolvedValue(
        {} as SetupAudit,
      );

      const result = await service.validateToken(mockToken, mockIp);

      expect(result).toBe(true);
      expect(mockSetupTokenRepository.findByToken).toHaveBeenCalledWith(
        mockToken,
      );
    });

    it('should return false for non-existent token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue(null);

      const result = await service.validateToken(mockToken, mockIp);

      expect(result).toBe(false);
    });

    it('should return false for used token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue({
        id: '1',
        token: mockToken,
        environment: 'development',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        createdByIp: mockIp,
        fingerprint: null,
        isUsed: true,
        usedAt: new Date(),
        usedByIp: mockIp,
        metadata: null,
      });

      const result = await service.validateToken(mockToken, mockIp);

      expect(result).toBe(false);
    });

    it('should return false for expired token', async () => {
      mockSetupTokenRepository.findByToken.mockResolvedValue({
        id: '1',
        token: mockToken,
        environment: 'development',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour in past
        createdAt: new Date(),
        createdByIp: mockIp,
        fingerprint: null,
        isUsed: false,
        usedAt: null,
        usedByIp: null,
        metadata: null,
      });

      const result = await service.validateToken(mockToken, mockIp);

      expect(result).toBe(false);
    });
  });
});
