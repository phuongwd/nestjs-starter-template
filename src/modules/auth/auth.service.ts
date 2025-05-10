import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserWithoutPassword } from '../users/types/user.type';
import { JwtPayload } from './types/jwt.types';
import { AUTH_CONSTANTS, AUTH_ERROR_MESSAGES } from './constants/auth.constant';
import { EmailExistsException } from './exceptions/auth.exception';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { TokensDto } from './dto/tokens.dto';
import { PasswordService } from '../users/services/password.service';
import {
  TokenExpiredException,
  InvalidTokenException,
} from './exceptions/auth.exception';
import { LoginAttemptService } from './services/login-attempt.service';
import { Request } from 'express';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserWithoutPasswordResponse } from '../users/types/user.type';
import { TokenService } from './services/token.service';
import { FingerprintService } from './services/fingerprint.service';
import { Inject } from '@nestjs/common';
import { OAUTH_INJECTION_TOKENS } from './oauth/constants/injection-tokens';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import {
  IOAuthProvider,
  OAuthProvider,
  OAuthPlatform,
} from './oauth/interfaces/oauth.interface';
import { IOAuthUserRepository } from './oauth/interfaces/oauth-user-repository.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  @Inject(OAUTH_INJECTION_TOKENS.PROVIDER.OAUTH)
  private readonly oauthProviders!: Map<string, IOAuthProvider>;

  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly loginAttemptService: LoginAttemptService,
    private readonly tokenService: TokenService,
    private readonly fingerprintService: FingerprintService,
    @Inject(OAUTH_INJECTION_TOKENS.REPOSITORY.OAUTH_USER)
    private readonly oauthUserRepository: IOAuthUserRepository,
    private readonly oauthStateService: OAuthStateService,
  ) {}

  /**
   * Validates user credentials and returns user without password
   * @param email - User's email
   * @param password - User's password
   * @returns User without password or null if invalid
   */
  private async validateUser(
    email: string,
    password: string,
  ): Promise<UserWithoutPassword | null> {
    if (await this.loginAttemptService.isAccountLocked(email)) {
      throw new UnauthorizedException(
        'Account temporarily locked. Please try again later.',
      );
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      this.logger.warn(`User not found with email: ${email}`);
      return null;
    }

    // If user was created via social auth (no password)
    if (!user.password) {
      this.logger.warn(
        `Password login attempted for social auth user: ${email}`,
      );
      throw new UnauthorizedException(
        'Please use social login for this account',
      );
    }

    const isPasswordValid = await this.passwordService.comparePasswords(
      password,
      user.password,
    );

    if (!isPasswordValid) {
      await this.loginAttemptService.recordFailedAttempt(email);
      this.logger.warn(`Invalid password attempt for user: ${email}`);
      return null;
    }

    await this.loginAttemptService.resetAttempts(email);
    const {
      password: _password,
      resetToken: _resetToken,
      resetTokenExpiresAt: _resetTokenExpiresAt,
      ...result
    } = user;
    return result;
  }

  /**
   * Creates JWT tokens for authenticated user
   * @param user - User without password
   * @param req - Express request object for fingerprint
   * @returns Access and refresh tokens
   */
  private async createTokens(
    user: UserWithoutPassword,
    req: Request,
  ): Promise<TokensDto> {
    const tokenId = crypto.randomBytes(32).toString('hex');
    const refreshTokenId = crypto.randomBytes(32).toString('hex');
    const now = Math.floor(Date.now() / 1000);

    // Generate fingerprint using FingerprintService
    const fingerprint = this.fingerprintService.generateFingerprint(req);

    // Convert time strings to seconds
    const accessTokenExpiry = 15 * 60; // 15 minutes in seconds
    const refreshTokenExpiry = 7 * 24 * 60 * 60; // 7 days in seconds

    // Get current token version for this user
    const tokenVersion = await this.tokenService.getCurrentTokenVersion(
      user.id,
    );

    const payload: JwtPayload = {
      sub: user.id,
      jti: tokenId,
      iat: now,
      exp: now + accessTokenExpiry,
      fgp: fingerprint,
      ver: tokenVersion, // Use current version instead of hardcoding 1
    };

    // Create refresh token with same security features
    const refreshPayload: JwtPayload = {
      sub: user.id,
      jti: refreshTokenId,
      iat: now,
      exp: now + refreshTokenExpiry,
      fgp: fingerprint,
      ver: tokenVersion, // Use current version instead of hardcoding 1
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(refreshPayload),
    ]);

    // Track these tokens for potential revocation
    await this.tokenService.trackUserTokens(user.id, [
      accessToken,
      refreshToken,
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  /**
   * Authenticates user and returns tokens
   * @param loginDto - Login credentials
   * @param req - Express request object
   * @returns Authentication response with tokens and user info
   * @throws UnauthorizedException
   */
  async login(loginDto: LoginDto, req: Request): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
    }

    const tokens = await this.createTokens(user, req);

    return new AuthResponseDto({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      user: new UserWithoutPasswordResponse(user),
    });
  }

  /**
   * Register new user
   * @param createUserDto - User registration data
   * @param req - Express request object
   * @returns Authentication response with tokens and user info
   * @throws EmailExistsException
   */
  async register(
    createUserDto: CreateUserDto,
    req: Request,
  ): Promise<AuthResponseDto> {
    try {
      const existingUser = await this.usersService.findByEmail(
        createUserDto.email,
      );
      if (existingUser) {
        throw new EmailExistsException();
      }

      const user = await this.usersService.create(createUserDto);
      const tokens = await this.createTokens(user, req);

      return new AuthResponseDto({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        user: new UserWithoutPasswordResponse(user),
      });
    } catch (error) {
      if (error instanceof EmailExistsException) {
        throw error;
      }
      this.logger.error(
        `Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  /**
   * Request password reset
   * @param email - User's email
   * @returns Success message
   * @throws NotFoundException
   */
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    await this.usersService.saveResetToken(
      user.id,
      hashedToken,
      new Date(Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_EXPIRES_IN),
    );

    // TODO: Send email with reset link
    return { message: 'Reset link sent to email' };
  }

  /**
   * Refresh access and refresh tokens
   * @param refreshToken - Current refresh token
   * @param req - Express request object
   * @returns New access and refresh tokens
   * @throws UnauthorizedException
   */
  async refreshTokens(refreshToken: string, req: Request): Promise<TokensDto> {
    try {
      const decoded =
        await this.jwtService.verifyAsync<JwtPayload>(refreshToken);

      // Validate token security features
      const isValid = await this.tokenService.validateToken(refreshToken, req);
      if (!isValid) {
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.INVALID_TOKEN);
      }

      const user = await this.usersService.findOne(decoded.sub);
      if (!user) {
        this.logger.warn(`User not found during token refresh: ${decoded.sub}`);
        throw new UnauthorizedException(AUTH_ERROR_MESSAGES.USER_NOT_FOUND);
      }

      return this.createTokens(user, req);
    } catch (error) {
      this.logger.error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new TokenExpiredException();
      }

      throw new InvalidTokenException();
    }
  }

  getAvailableProviders(): Set<string> {
    return new Set(this.oauthProviders.keys());
  }

  async getProviderAuthUrl(
    provider: string,
    state: string,
  ): Promise<{ url: string }> {
    if (this.oauthProviders.size === 0) {
      this.logger.warn('No OAuth providers are configured');
      throw new BadRequestException('OAuth authentication is not available');
    }

    const authProvider = this.oauthProviders.get(provider);
    if (!authProvider) {
      this.logger.warn(
        `Requested OAuth provider '${provider}' is not configured`,
      );
      throw new BadRequestException(
        `Authentication provider '${provider}' is not available`,
      );
    }

    const url = await authProvider.getAuthorizationUrl(state);
    return { url };
  }

  async handleSocialCallback(
    provider: OAuthProvider,
    code: string,
    state: string,
    platform?: OAuthPlatform,
  ): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserWithoutPassword;
  }> {
    try {
      // 1. Validate provider
      if (this.oauthProviders.size === 0) {
        this.logger.warn('No OAuth providers are configured');
        throw new BadRequestException('OAuth authentication is not available');
      }

      const authProvider = this.oauthProviders.get(provider);
      if (!authProvider) {
        this.logger.warn(
          `Requested OAuth provider '${provider}' is not configured`,
        );
        throw new BadRequestException(
          `Authentication provider '${provider}' is not available`,
        );
      }

      // 2. Validate state and get user profile
      try {
        await this.oauthStateService.validateState(state, {
          provider,
          platform,
        });
      } catch (error) {
        this.logger.warn(
          `Invalid state parameter in social auth callback for provider ${provider}`,
          {
            state,
            platform,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );
        throw new UnauthorizedException('Invalid authentication state');
      }

      // 3. Get user profile from provider
      let profile;
      try {
        profile = await authProvider.handleCallback(code, state, platform);
      } catch (error) {
        this.logger.error(`Failed to get user profile from ${provider}`, {
          code: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          platform,
        });
        throw new UnauthorizedException('Failed to authenticate with provider');
      }

      // 4. Find or create user
      let user;
      try {
        // For Apple Android flow, check for stored user data
        if (provider === 'apple' && platform === 'android') {
          const storedUserData =
            await this.oauthStateService.getAppleUserData(state);
          if (storedUserData?.name) {
            profile = {
              ...profile,
              firstName: storedUserData.name.firstName || '',
              lastName: storedUserData.name.lastName || '',
            };
          }
        }

        user = await this.oauthUserRepository.findOrCreateUser(profile);
      } catch (error) {
        this.logger.error(
          `Failed to create/update user from ${provider} profile`,
          {
            email: profile?.email,
            platform,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
          },
        );
        throw new InternalServerErrorException(
          'Failed to process authentication',
        );
      }

      // 5. Generate tokens
      try {
        const tokens = await this.createTokens(user, {} as Request);
        this.logger.log(
          `Successful social auth for user ${user.email} via ${provider}`,
          { platform },
        );
        return { user, ...tokens };
      } catch (error) {
        this.logger.error(`Failed to generate tokens for ${provider} auth`, {
          userId: user?.id,
          platform,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw new InternalServerErrorException(
          'Failed to complete authentication',
        );
      }
    } catch (error) {
      // Handle any unhandled errors
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error(
        `Unhandled error in social auth callback for ${provider}`,
        {
          platform,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      throw new InternalServerErrorException('Authentication failed');
    }
  }

  /**
   * Logout user and invalidate their tokens
   * @param userId - ID of the user to logout
   */
  async logout(userId: number): Promise<void> {
    try {
      // Invalidate all tokens for the user
      await this.tokenService.revokeAllUserTokens(userId);

      this.logger.debug(`User ${userId} logged out successfully`);
    } catch (error) {
      this.logger.error(`Failed to logout user ${userId}`, {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw new InternalServerErrorException('Failed to complete logout');
    }
  }
}
