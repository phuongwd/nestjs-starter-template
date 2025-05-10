import { Test, TestingModule } from '@nestjs/testing';
import { SETUP_TOKENS } from '../constants/setup.constants';
import { SecurityContextService } from '../services/security-context.service';
import { SetupCommand } from '../cli/commands/setup.command';
import { GenerateTokenCommand } from '../cli/commands/generate-token.command';
import { CompleteSetupCommand } from '../cli/commands/complete-setup.command';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';
import inquirer from 'inquirer';

jest.mock('inquirer');
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

// Mock process.exit
const mockExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((code?: number | string | null) => {
    throw new Error(`Process.exit(${code})`);
  }) as jest.SpyInstance<never, [code?: number | string | null]>;

describe('Setup CLI Commands', () => {
  let setupCommand: SetupCommand;
  let generateTokenCommand: GenerateTokenCommand;
  let completeSetupCommand: CompleteSetupCommand;

  const mockSetupService = {
    generateToken: jest.fn(),
    validateToken: jest.fn(),
    completeSetup: jest.fn(),
    isSetupRequired: jest.fn(),
  };

  const mockSecurityContext = {
    validateEnvironment: jest.fn(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupCommand,
        GenerateTokenCommand,
        CompleteSetupCommand,
        {
          provide: SETUP_TOKENS.SERVICE.SETUP,
          useValue: mockSetupService,
        },
        {
          provide: SecurityContextService,
          useValue: mockSecurityContext,
        },
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

    setupCommand = module.get<SetupCommand>(SetupCommand);
    generateTokenCommand =
      module.get<GenerateTokenCommand>(GenerateTokenCommand);
    completeSetupCommand =
      module.get<CompleteSetupCommand>(CompleteSetupCommand);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecurityContext.validateEnvironment.mockResolvedValue(undefined);
    mockSetupService.isSetupRequired.mockResolvedValue(true);
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('setup', () => {
    it('should show available commands', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log');

      await setupCommand.run([], {
        environment: 'development',
        force: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available setup commands'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('generate-token'),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('complete'),
      );

      consoleLogSpy.mockRestore();
    });

    it('should validate environment parameter', async () => {
      expect(() => setupCommand.parseEnvironment('invalid-env')).toThrow(
        'Invalid environment. Must be one of: development, staging, production',
      );
    });

    it('should not show commands if setup is not required', async () => {
      mockSetupService.isSetupRequired.mockResolvedValue(false);
      const consoleLogSpy = jest.spyOn(console, 'log');

      await setupCommand.run([], {
        environment: 'development',
        force: false,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('System is already set up'),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('setup:generate-token', () => {
    it('should generate token for development environment', async () => {
      const mockToken = {
        token: 'test-token-123',
        expiresAt: new Date(),
      };
      mockSetupService.generateToken.mockResolvedValue(mockToken);

      const consoleLogSpy = jest.spyOn(console, 'log');

      await generateTokenCommand.run([], {
        environment: 'development',
        force: false,
        expiresIn: 60,
      });

      expect(mockSetupService.generateToken).toHaveBeenCalledWith(
        'CLI',
        'development',
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Setup token generated successfully'),
      );

      consoleLogSpy.mockRestore();
    });

    it('should validate environment parameter', async () => {
      expect(() =>
        generateTokenCommand.parseEnvironment('invalid-env'),
      ).toThrow(
        'Invalid environment. Must be one of: development, staging, production',
      );
    });

    it('should validate expires-in parameter', async () => {
      expect(() => generateTokenCommand.parseExpiresIn('-1')).toThrow(
        'Expiration time must be a positive number of minutes',
      );
      expect(() => generateTokenCommand.parseExpiresIn('not-a-number')).toThrow(
        'Expiration time must be a positive number of minutes',
      );
    });

    it('should handle token generation errors', async () => {
      mockSetupService.generateToken.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        generateTokenCommand.run([], {
          environment: 'development',
          force: false,
        }),
      ).rejects.toThrowError('Process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to generate setup token'),
        'Test error',
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setup:complete', () => {
    const mockSetupData = {
      email: 'admin@test.com',
      password: 'Password123!',
      firstName: 'Admin',
      lastName: 'User',
      organizationName: 'Test Org',
    };

    beforeEach(() => {
      mockedInquirer.prompt.mockResolvedValue(mockSetupData);
    });

    it('should complete setup with valid token', async () => {
      const mockToken = 'a'.repeat(32);
      mockSetupService.validateToken.mockResolvedValue(true);
      mockSetupService.completeSetup.mockResolvedValue(undefined);

      await completeSetupCommand.run([], {
        token: mockToken,
        environment: 'development',
        force: false,
      });

      expect(mockSetupService.validateToken).toHaveBeenCalledWith(
        mockToken,
        'CLI',
      );
      expect(mockSetupService.completeSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockSetupData.email,
          password: mockSetupData.password,
          firstName: mockSetupData.firstName,
          lastName: mockSetupData.lastName,
          setupToken: mockToken,
          metadata: expect.objectContaining({
            source: 'cli',
            environment: 'development',
            organizationName: mockSetupData.organizationName,
          }),
        }),
        'CLI',
      );
    });

    it('should fail with invalid token format', async () => {
      expect(() => completeSetupCommand.parseToken('invalid-token')).toThrow(
        'Invalid token format',
      );
    });

    it('should fail with invalid token', async () => {
      const mockToken = 'a'.repeat(32);
      mockSetupService.validateToken.mockResolvedValue(false);

      await expect(
        completeSetupCommand.run([], {
          token: mockToken,
          environment: 'development',
        }),
      ).rejects.toThrowError('Process.exit(1)');
    });

    it('should validate required parameters', async () => {
      // Missing token
      await expect(
        completeSetupCommand.run([], {
          environment: 'development',
        }),
      ).rejects.toThrowError();

      // Missing environment
      await expect(
        completeSetupCommand.run([], {
          token: 'a'.repeat(32),
        }),
      ).rejects.toThrowError();
    });

    it('should handle setup completion errors', async () => {
      const mockToken = 'a'.repeat(32);
      mockSetupService.validateToken.mockResolvedValue(true);
      mockSetupService.completeSetup.mockRejectedValue(new Error('Test error'));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      await expect(
        completeSetupCommand.run([], {
          token: mockToken,
          environment: 'development',
        }),
      ).rejects.toThrowError('Process.exit(1)');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to complete setup'),
        'Test error',
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
