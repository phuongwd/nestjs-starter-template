import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import {
  EmailExistsException,
  InvalidTokenException,
} from './exceptions/auth.exception';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TokenExpiredException } from './exceptions/auth.exception';
import { PasswordService } from '../users/services/password.service';
import { LoginAttemptService } from './services/login-attempt.service';
import { TokenService } from './services/token.service';
import { Request } from 'express';
import { AUTH_ERROR_MESSAGES } from './constants/auth.constant';
import { FingerprintService } from './services/fingerprint.service';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import { OAUTH_INJECTION_TOKENS } from './oauth/constants/injection-tokens';
import { IOAuthUserRepository } from './oauth/interfaces/oauth-user-repository.interface';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let passwordService: PasswordService;
  let loginAttemptService: LoginAttemptService;
  let tokenService: TokenService;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    provider: null,
    providerId: null,
    picture: null,
    resetToken: null,
    resetTokenExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    systemRoles: [],
    organizationMembers: [],
  };

  const mockUserWithoutPassword = {
    id: mockUser.id,
    email: mockUser.email,
    firstName: mockUser.firstName,
    lastName: mockUser.lastName,
    provider: null,
    providerId: null,
    picture: null,
    createdAt: mockUser.createdAt,
    updatedAt: mockUser.updatedAt,
    systemRoles: [],
    organizationMembers: [],
  };

  const mockRequest = {
    headers: {
      'user-agent': 'test-agent',
    },
    ip: '127.0.0.1',
  } as Request;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            create: jest.fn(),
            saveResetToken: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('test-token'),
            verifyAsync: jest.fn().mockResolvedValue({ sub: 1 }),
          },
        },
        {
          provide: PasswordService,
          useValue: {
            comparePasswords: jest.fn().mockResolvedValue(false),
            hashPassword: jest.fn().mockResolvedValue('hashedPassword123'),
          },
        },
        {
          provide: LoginAttemptService,
          useValue: {
            isAccountLocked: jest.fn().mockResolvedValue(false),
            recordFailedAttempt: jest.fn(),
            resetAttempts: jest.fn(),
          },
        },
        {
          provide: TokenService,
          useValue: {
            generateToken: jest.fn().mockResolvedValue('test-token'),
            validateToken: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: FingerprintService,
          useValue: {
            generateFingerprint: jest.fn().mockReturnValue('test-fingerprint'),
          },
        },
        {
          provide: OAUTH_INJECTION_TOKENS.PROVIDER.OAUTH,
          useValue: new Map(),
        },
        {
          provide: OAUTH_INJECTION_TOKENS.REPOSITORY.OAUTH_USER,
          useValue: {
            findOrCreateUser: jest.fn(),
          } as IOAuthUserRepository,
        },
        {
          provide: OAuthStateService,
          useValue: {
            validateState: jest.fn(),
            getAppleUserData: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    passwordService = module.get<PasswordService>(PasswordService);
    loginAttemptService = module.get<LoginAttemptService>(LoginAttemptService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'validPassword123',
    };

    it('should return auth response when credentials are valid', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(true);
      jest.spyOn(tokenService, 'generateToken').mockResolvedValue('test-token');

      // Act
      const result = await authService.login(loginDto, mockRequest);

      // Assert
      expect(result).toEqual({
        accessToken: 'test-token',
        refreshToken: 'test-token',
        user: expect.objectContaining(mockUserWithoutPassword),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(passwordService.comparePasswords).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(tokenService.generateToken).toHaveBeenCalledWith(
        mockUser.id,
        mockRequest,
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto, mockRequest)).rejects.toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS),
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto, mockRequest)).rejects.toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS),
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      // Arrange
      jest
        .spyOn(loginAttemptService, 'isAccountLocked')
        .mockResolvedValue(true);

      // Act & Assert
      await expect(authService.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(loginAttemptService.isAccountLocked).toHaveBeenCalledWith(
        loginDto.email,
      );
    });

    it('should record failed attempt when password is invalid', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto, mockRequest)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(loginAttemptService.recordFailedAttempt).toHaveBeenCalledWith(
        loginDto.email,
      );
    });

    it('should reset attempts on successful login', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(passwordService, 'comparePasswords').mockResolvedValue(true);

      // Act
      await authService.login(loginDto, mockRequest);

      // Assert
      expect(loginAttemptService.resetAttempts).toHaveBeenCalledWith(
        loginDto.email,
      );
    });
  });

  describe('register', () => {
    const createUserDto: CreateUserDto = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
    };

    it('should create new user and return tokens', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest
        .spyOn(usersService, 'create')
        .mockResolvedValue(mockUserWithoutPassword);

      // Act
      const result = await authService.register(createUserDto, mockRequest);

      // Assert
      expect(result).toEqual({
        accessToken: 'test-token',
        refreshToken: 'test-token',
        user: expect.objectContaining(mockUserWithoutPassword),
      });
      expect(usersService.findByEmail).toHaveBeenCalledWith(
        createUserDto.email,
      );
      expect(usersService.create).toHaveBeenCalledWith(createUserDto);
    });

    it('should throw EmailExistsException when email already exists', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        authService.register(createUserDto, mockRequest),
      ).rejects.toThrow(EmailExistsException);
    });
  });

  describe('refreshTokens', () => {
    const refreshToken = 'valid.refresh.token';

    it('should return new tokens when refresh token is valid', async () => {
      // Arrange
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 1 });
      jest
        .spyOn(usersService, 'findOne')
        .mockResolvedValue(mockUserWithoutPassword);
      jest.spyOn(tokenService, 'validateToken').mockResolvedValue(true);

      // Act
      const result = await authService.refreshTokens(refreshToken, mockRequest);

      // Assert
      expect(result).toEqual({
        access_token: 'test-token',
        refresh_token: 'test-token',
      });
      expect(tokenService.validateToken).toHaveBeenCalledWith(
        refreshToken,
        mockRequest,
      );
    });

    it('should throw UnauthorizedException when token validation fails', async () => {
      // Arrange
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({ sub: 1 });
      jest.spyOn(tokenService, 'validateToken').mockResolvedValue(false);

      // Act & Assert
      await expect(
        authService.refreshTokens(refreshToken, mockRequest),
      ).rejects.toThrow(
        new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN),
      );
    });

    it('should throw TokenExpiredException when token is expired', async () => {
      // Arrange
      const error = new Error();
      error.name = 'TokenExpiredError';
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(error);

      // Act & Assert
      await expect(
        authService.refreshTokens(refreshToken, mockRequest),
      ).rejects.toThrow(TokenExpiredException);
    });

    it('should throw InvalidTokenException for other token errors', async () => {
      // Arrange
      jest
        .spyOn(jwtService, 'verifyAsync')
        .mockRejectedValue(new Error('Invalid token'));

      // Act & Assert
      await expect(
        authService.refreshTokens(refreshToken, mockRequest),
      ).rejects.toThrow(InvalidTokenException);
    });
  });

  describe('requestPasswordReset', () => {
    const email = 'test@example.com';

    it('should save reset token and return success message', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);

      // Act
      const result = await authService.requestPasswordReset(email);

      // Assert
      expect(result).toEqual({ message: 'Reset link sent to email' });
      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(usersService.saveResetToken).toHaveBeenCalledWith(
        mockUser.id,
        expect.any(String),
        expect.any(Date),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);

      // Act & Assert
      await expect(authService.requestPasswordReset(email)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
