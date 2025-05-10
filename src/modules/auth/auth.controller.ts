import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Logger,
  Req,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { TokensDto } from './dto/tokens.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  UserWithoutPassword,
  UserWithoutPasswordResponse,
} from '../users/types/user.type';
import { LoginDto } from './dto/login.dto';
import { Auth } from '@/shared/decorators/auth.decorator';
import { Public } from '@/shared/decorators/public.decorator';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Request as ExpressRequest } from 'express';
import { OAuthStateService } from './oauth/services/oauth-state.service';
import { OAuthProvider } from './oauth/interfaces/oauth.interface';
import { CustomThrottlerGuard } from '@/shared/guards/throttler.guard';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(CustomThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly oauthStateService: OAuthStateService,
  ) {}

  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Authenticates a user and returns tokens. Requires User-Agent header for fingerprinting. Rate limited to prevent brute force attacks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns access token, refresh token, and user data',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts' })
  @Public()
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthResponseDto> {
    this.logger.debug(`Login attempt for email: ${loginDto.email}`);
    return this.authService.login(loginDto, req);
  }

  @ApiOperation({
    summary: 'User registration',
    description:
      'Register a new user account. Requires User-Agent header for fingerprinting.',
  })
  @ApiResponse({
    status: 201,
    description:
      'User successfully registered. Returns access token, refresh token, and user data',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid registration data' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  @Public()
  @Post('register')
  async register(
    @Body() registerDto: CreateUserDto,
    @Req() req: ExpressRequest,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, req);
  }

  @ApiOperation({
    summary: 'Get user profile',
    description:
      "Retrieve the authenticated user's profile. Requires valid access token and User-Agent header.",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: UserWithoutPasswordResponse,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  @ApiBearerAuth()
  @Auth()
  @Get('profile')
  async getProfile(
    @Request() req: { user: UserWithoutPassword },
  ): Promise<UserWithoutPassword> {
    return req.user;
  }

  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Get a new access token using a valid refresh token. Requires User-Agent header for fingerprint validation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    type: TokensDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired token',
  })
  @ApiResponse({ status: 429, description: 'Too many refresh attempts' })
  @ApiBearerAuth()
  @Auth()
  @Post('refresh')
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: ExpressRequest,
  ): Promise<TokensDto> {
    return this.authService.refreshTokens(refreshTokenDto.refresh_token, req);
  }

  @Get('oauth/providers')
  @Public()
  @ApiOperation({
    summary: 'Get available OAuth providers',
    description:
      'Returns a list of configured and available OAuth providers for authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'List of available OAuth providers',
    schema: {
      type: 'object',
      properties: {
        providers: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['google', 'github', 'microsoft', 'apple'],
          },
          description: 'List of enabled OAuth provider names',
        },
      },
      example: {
        providers: ['google', 'github', 'microsoft', 'apple'],
      },
    },
  })
  getAvailableProviders(): { providers: string[] } {
    return {
      providers: Array.from(this.authService.getAvailableProviders()),
    };
  }

  @Get('oauth/:provider/url')
  @Public()
  @ApiOperation({
    summary: 'Get OAuth provider authorization URL',
    description:
      'Generates an authorization URL for the specified OAuth provider with CSRF protection.',
  })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'github', 'microsoft', 'apple'],
    description: 'OAuth provider name',
  })
  @ApiQuery({
    name: 'platform',
    enum: ['ios', 'android', 'web'],
    required: false,
    description:
      'Client platform type for platform-specific authentication flows',
  })
  @ApiResponse({
    status: 200,
    description: 'Authorization URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'OAuth authorization URL',
          example: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid provider or provider not configured',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async getProviderAuthUrl(
    @Param('provider') provider: OAuthProvider,
    @Req() req: ExpressRequest,
    @Query('platform') platform?: 'ios' | 'android' | 'web',
  ): Promise<{ url: string }> {
    const state = await this.oauthStateService.generateState({
      provider,
      clientIp: req.ip,
      userAgent: req.headers['user-agent'] as string | undefined,
      platform, // Store platform in state
    });
    return this.authService.getProviderAuthUrl(provider, state);
  }

  @Get('oauth/:provider/callback')
  @Public()
  @ApiOperation({
    summary: 'Handle OAuth provider callback',
    description:
      'Processes the OAuth callback from providers and completes the authentication flow.',
  })
  @ApiParam({
    name: 'provider',
    enum: ['google', 'github', 'microsoft', 'apple'],
    description: 'OAuth provider name',
  })
  @ApiQuery({
    name: 'code',
    type: 'string',
    required: true,
    description: 'Authorization code from OAuth provider',
  })
  @ApiQuery({
    name: 'state',
    type: 'string',
    required: true,
    description: 'CSRF state token for verification',
  })
  @ApiQuery({
    name: 'error',
    type: 'string',
    required: false,
    description: 'Error message from OAuth provider',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or authentication failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid state token or unauthorized',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async handleProviderCallback(
    @Param('provider') provider: OAuthProvider,
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error?: string,
  ): Promise<AuthResponseDto> {
    if (error) {
      throw new BadRequestException(`Authentication failed: ${error}`);
    }

    const stateData = await this.oauthStateService.validateState(state, {
      provider,
    });
    const result = await this.authService.handleSocialCallback(
      provider,
      code,
      state,
      stateData.platform,
    );
    return new AuthResponseDto({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      user: new UserWithoutPasswordResponse(result.user),
    });
  }

  @Post('oauth/apple/android-callback')
  @Public()
  @ApiOperation({
    summary: 'Handle Apple Sign In callback for Android',
    description:
      'Processes the Apple Sign In callback specifically for Android platform, handling the form-post response.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['code', 'state'],
      properties: {
        code: {
          type: 'string',
          description: 'Authorization code from Apple',
        },
        state: {
          type: 'string',
          description: 'CSRF state token for verification',
        },
        user: {
          type: 'string',
          description:
            'JSON string containing user data (first-time login only)',
        },
        error: {
          type: 'string',
          description: 'Error message from Apple',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters or authentication failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid state token or unauthorized',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests',
  })
  async handleAppleAndroidCallback(
    @Body('code') code: string,
    @Body('state') state: string,
    @Body('user') appleUser?: string,
    @Body('error') error?: string,
  ): Promise<AuthResponseDto> {
    if (error) {
      this.logger.error('Apple Sign In error (Android):', { error });
      throw new BadRequestException(`Authentication failed: ${error}`);
    }

    try {
      // Parse Apple user data if provided (first-time login)
      if (appleUser) {
        try {
          const userData = JSON.parse(appleUser);
          // Store the user data in Redis for use during profile creation
          await this.oauthStateService.storeAppleUserData(state, userData);
        } catch (e) {
          this.logger.warn('Failed to parse Apple user data:', e);
        }
      }

      // Validate state and get platform info
      await this.oauthStateService.validateState(state, {
        provider: 'apple',
      });

      const result = await this.authService.handleSocialCallback(
        'apple',
        code,
        state,
        'android',
      );

      return new AuthResponseDto({
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        user: new UserWithoutPasswordResponse(result.user),
      });
    } catch (error) {
      this.logger.error('Apple Android callback failed:', {
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }
  }

  @Post('logout')
  @Auth()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidates the current access token and cleans up the session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully logged out',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Successfully logged out',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async logout(
    @Request() req: { user: UserWithoutPassword },
  ): Promise<{ message: string }> {
    await this.authService.logout(req.user.id);
    return { message: 'Successfully logged out' };
  }
}
