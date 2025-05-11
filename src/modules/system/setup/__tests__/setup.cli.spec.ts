import { Test, TestingModule } from '@nestjs/testing';
import { SETUP_TOKENS } from '../constants/setup.constants';
import { SecurityContextService } from '../services/security-context.service';
import { SetupCommand } from '../cli/commands/setup.command';
import { GenerateTokenCommand } from '../cli/commands/generate-token.command';
import { CompleteSetupCommand } from '../cli/commands/complete-setup.command';
import { ConfigService } from '@nestjs/config';
import inquirer from 'inquirer';

jest.mock('inquirer');
const mockedInquirer = inquirer as jest.Mocked<typeof inquirer>;

// Mock process.exit but store it in a variable we use
jest
  .spyOn(process, 'exit')
  .mockImplementation((code?: number | string | null) => {
    throw new Error(`Process.exit(${code})`);
  });

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

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockSetupData = {
    email: 'admin@test.com',
    password: 'Password123!',
    firstName: 'Admin',
    lastName: 'User',
    organizationName: 'Test Org',
  };

  beforeEach(async () => {
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

    // Reset all mocks
    jest.clearAllMocks();
    mockSecurityContext.validateEnvironment.mockResolvedValue(undefined);
    mockSetupService.isSetupRequired.mockResolvedValue(true);
    mockedInquirer.prompt.mockResolvedValue(mockSetupData);
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
    const validToken = 'a'.repeat(32);

    it('should complete setup with valid token and data', async () => {
      // Setup mocks
      mockSetupService.validateToken.mockResolvedValue(true);
      mockSetupService.completeSetup.mockResolvedValue(undefined);

      // Execute
      await completeSetupCommand.run([], {
        token: validToken,
        environment: 'development',
      });

      // Verify token validation
      expect(mockSetupService.validateToken).toHaveBeenCalledWith(
        validToken,
        'CLI',
      );

      // Verify setup completion
      expect(mockSetupService.completeSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          email: mockSetupData.email,
          password: mockSetupData.password,
          firstName: mockSetupData.firstName,
          lastName: mockSetupData.lastName,
          setupToken: validToken,
          metadata: expect.objectContaining({
            source: 'cli',
            environment: 'development',
            organizationName: mockSetupData.organizationName,
          }),
        }),
        'CLI',
      );
    });

    it('should handle token validation failure with detailed error', async () => {
      // Setup mock to simulate validation failure
      mockSetupService.validateToken.mockResolvedValue(false);
      const consoleErrorSpy = jest.spyOn(console, 'error');

      // Execute and verify error handling
      await expect(
        completeSetupCommand.run([], {
          token: validToken,
          environment: 'development',
        }),
      ).rejects.toThrow('Process.exit(1)');

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token validation failed for token:'),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Timestamp:'),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle token validation errors gracefully', async () => {
      // Setup mock to simulate validation error
      const errorMessage = 'Token validation failed';
      mockSetupService.validateToken.mockRejectedValue(new Error(errorMessage));
      const consoleErrorSpy = jest.spyOn(console, 'error');

      // Execute and verify error handling
      await expect(
        completeSetupCommand.run([], {
          token: validToken,
          environment: 'development',
        }),
      ).rejects.toThrow('Process.exit(1)');

      // Verify error logging
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Token validation error:'),
        expect.stringContaining(errorMessage),
      );

      consoleErrorSpy.mockRestore();
    });

    it('should validate required environment parameter', async () => {
      await expect(
        completeSetupCommand.run([], {
          token: validToken,
        }),
      ).rejects.toThrow();

      expect(mockSecurityContext.validateEnvironment).not.toHaveBeenCalled();
    });

    it('should validate required token parameter', async () => {
      await expect(
        completeSetupCommand.run([], {
          environment: 'development',
        }),
      ).rejects.toThrow('Setup token is required');
    });

    it('should validate token format', () => {
      expect(() => completeSetupCommand.parseToken('invalid-token')).toThrow(
        'Invalid token format',
      );
    });

    it('should validate user input', async () => {
      // Mock inquirer with invalid data
      const invalidData = {
        email: 'invalid-email',
        password: '123', // Too short
        firstName: '',
        lastName: '',
        organizationName: '',
      };
      mockedInquirer.prompt.mockResolvedValueOnce(invalidData);
      mockSetupService.validateToken.mockResolvedValue(true);

      await expect(
        completeSetupCommand.run([], {
          token: 'a'.repeat(32),
          environment: 'development',
        }),
      ).rejects.toThrow();

      // Verify validation was performed
      expect(mockedInquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            validate: expect.any(Function),
          }),
        ]),
      );

      // Test email validation
      const emailQuestion = (
        mockedInquirer.prompt.mock.calls[0][0] as any[]
      ).find((q) => q.name === 'email');
      expect(emailQuestion.validate('invalid-email')).toBe(
        'Please enter a valid email address',
      );
      expect(emailQuestion.validate('valid@email.com')).toBe(true);

      // Test password validation
      const passwordQuestion = (
        mockedInquirer.prompt.mock.calls[0][0] as any[]
      ).find((q) => q.name === 'password');
      expect(passwordQuestion.validate('123')).toBe(
        'Password must be at least 8 characters long',
      );
      expect(passwordQuestion.validate('Password123!')).toBe(true);
    });

    it('should set correct metadata in setup completion', async () => {
      mockSetupService.validateToken.mockResolvedValue(true);
      mockSetupService.completeSetup.mockResolvedValue(undefined);

      await completeSetupCommand.run([], {
        token: 'a'.repeat(32),
        environment: 'staging',
      });

      expect(mockSetupService.completeSetup).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            source: 'cli',
            environment: 'staging',
            organizationName: mockSetupData.organizationName,
          },
        }),
        'CLI',
      );
    });
  });
});
