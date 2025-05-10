import {
  Injectable,
  BadRequestException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IOAuthProvider,
  OAuthUserProfile,
  AppleUserProfile,
  AppleTokenResponse,
  AppleIdToken,
} from '../interfaces/oauth.interface';
import axios, { AxiosError } from 'axios';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { RedisService } from '@/core/redis/redis.service';

interface AppleKey {
  kid: string;
  [key: string]: unknown;
}

@Injectable()
export class AppleAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(AppleAuthProvider.name);
  private readonly clientId: string;
  private readonly teamId: string;
  private readonly keyId: string;
  private readonly privateKey: string;
  private readonly redirectUri: string;
  private readonly APPLE_AUTH_URL = 'https://appleid.apple.com/auth/authorize';
  private readonly APPLE_TOKEN_URL = 'https://appleid.apple.com/auth/token';
  private readonly CODE_VERIFIER_PREFIX = 'apple:pkce:';
  private readonly CODE_VERIFIER_TTL = 600; // 10 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.clientId = this.configService.get('APPLE_CLIENT_ID') ?? '';
    this.teamId = this.configService.get('APPLE_TEAM_ID') ?? '';
    this.keyId = this.configService.get('APPLE_KEY_ID') ?? '';
    this.privateKey = this.configService.get('APPLE_PRIVATE_KEY') ?? '';
    this.redirectUri = this.configService.get('APPLE_REDIRECT_URI') ?? '';
  }

  async getAuthorizationUrl(
    state: string,
    platform?: 'ios' | 'android' | 'web',
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Apple OAuth is not configured');
    }

    // Generate PKCE challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Store code verifier for later use
    await this.storeCodeVerifier(state, codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'name email',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // For Android/Web, we need to use form_post response mode and handle the redirect properly
    if (platform === 'android' || platform === 'web') {
      params.append('response_mode', 'form_post');
    }

    // For iOS native flow
    if (platform === 'ios') {
      // iOS native flow doesn't need response_mode
      // The native SDK will handle the response
      params.append('platform', 'ios');
    }

    this.logger.debug(
      `Generating auth URL for platform: ${platform || 'default'}`,
    );
    return `${this.APPLE_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    platform?: 'ios' | 'android' | 'web',
  ): Promise<OAuthUserProfile> {
    if (!this.isConfigured()) {
      throw new Error('Apple OAuth is not configured');
    }

    try {
      // Get the stored code verifier
      const codeVerifier = await this.getStoredCodeVerifier(state);
      if (!codeVerifier) {
        this.logger.warn(
          `Invalid state for platform: ${platform || 'default'}`,
        );
        if (platform === 'android') {
          throw new BadRequestException(
            'Authentication session expired. Please try again.',
          );
        }
        throw new BadRequestException('Invalid state parameter');
      }

      // 1. Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code, codeVerifier);

      // 2. Verify and decode the ID token
      const decodedToken = await this.verifyAndDecodeIdToken(tokens.id_token);

      // 3. Transform to our standard profile format
      // Note: Apple only provides name information on the first sign in
      const profile: AppleUserProfile = {
        sub: decodedToken.sub,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified,
        is_private_email: decodedToken.is_private_email,
        name: decodedToken.name,
      };

      if (!profile.email) {
        if (platform === 'android') {
          throw new UnauthorizedException(
            'Email access is required to sign in with Apple. Please try again and allow email access.',
          );
        }
        throw new UnauthorizedException('Email is required');
      }

      // Handle first-time login without name (common in Android/Web flow)
      if (!profile.name && (platform === 'android' || platform === 'web')) {
        this.logger.warn(
          `No name provided for ${platform} user: ${profile.email}`,
        );
      }

      return {
        provider: 'apple',
        id: profile.sub,
        email: profile.email,
        firstName: profile.name?.firstName || '',
        lastName: profile.name?.lastName || '',
        avatar: undefined, // Apple doesn't provide profile pictures
      };
    } catch (error: unknown) {
      this.logger.error(
        `Apple authentication failed for platform: ${platform}`,
        {
          error: error instanceof Error ? error.stack : String(error),
          code:
            error instanceof AxiosError ? error.response?.status : undefined,
          message: error instanceof Error ? error.message : String(error),
          platform,
        },
      );

      if (error instanceof AxiosError) {
        switch (error.response?.status) {
          case 401:
            if (platform === 'android') {
              throw new UnauthorizedException(
                'Sign in with Apple failed. Please try again.',
              );
            }
            throw new UnauthorizedException(
              'Invalid authentication credentials',
            );
          case 403:
            if (platform === 'android') {
              throw new UnauthorizedException(
                'Access denied. Please ensure you have granted the necessary permissions.',
              );
            }
            throw new UnauthorizedException('Access denied by Apple');
          default:
            if (platform === 'android') {
              throw new BadRequestException(
                'Unable to complete Apple sign in. Please try again.',
              );
            }
            throw new BadRequestException('Failed to authenticate with Apple');
        }
      }

      // Handle Android-specific cancellation
      if (
        platform === 'android' &&
        error instanceof Error &&
        error.message.includes('canceled')
      ) {
        throw new BadRequestException(
          'Sign in was cancelled. Please try again.',
        );
      }

      throw new BadRequestException('Failed to authenticate with Apple');
    }
  }

  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string,
  ): Promise<AppleTokenResponse> {
    const clientSecret = this.generateClientSecret();

    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: this.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await axios.post(this.APPLE_TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  }

  private generateClientSecret(): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 3600; // 1 hour

    const claims = {
      iss: this.teamId,
      iat: now,
      exp: now + expiresIn,
      aud: 'https://appleid.apple.com',
      sub: this.clientId,
    };

    return jwt.sign(claims, this.privateKey, {
      algorithm: 'ES256',
      header: { alg: 'ES256', kid: this.keyId },
    });
  }

  private async verifyAndDecodeIdToken(
    idToken: string,
  ): Promise<
    AppleIdToken & { name?: { firstName?: string; lastName?: string } }
  > {
    try {
      // Apple's public keys are available at https://appleid.apple.com/auth/keys
      // In production, you should cache these keys and handle key rotation
      const response = await axios.get('https://appleid.apple.com/auth/keys');
      const keys = response.data.keys;

      const decodedToken = jwt.decode(idToken, { complete: true });
      if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
        throw new Error('Invalid ID token format');
      }

      const key = keys.find((k: AppleKey) => k.kid === decodedToken.header.kid);
      if (!key) {
        throw new Error('Matching key not found');
      }

      const verified = jwt.verify(idToken, key, {
        algorithms: ['RS256'],
        audience: this.clientId,
        issuer: 'https://appleid.apple.com',
      });

      return verified as AppleIdToken & {
        name?: { firstName?: string; lastName?: string };
      };
    } catch (error) {
      this.logger.error('Failed to verify ID token', error);
      throw new UnauthorizedException('Invalid ID token');
    }
  }

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    const hash = crypto.createHash('sha256').update(verifier).digest();
    return hash.toString('base64url');
  }

  private async storeCodeVerifier(
    state: string,
    codeVerifier: string,
  ): Promise<void> {
    const key = `${this.CODE_VERIFIER_PREFIX}${state}`;
    await this.redisService.set(key, codeVerifier, this.CODE_VERIFIER_TTL);
    this.logger.debug(`Stored code verifier for state: ${state}`);
  }

  private async getStoredCodeVerifier(state: string): Promise<string | null> {
    const key = `${this.CODE_VERIFIER_PREFIX}${state}`;
    const verifier = await this.redisService.get<string>(key);
    if (verifier) {
      await this.redisService.del(key); // Delete after retrieval
      this.logger.debug(
        `Retrieved and deleted code verifier for state: ${state}`,
      );
    } else {
      this.logger.warn(`No code verifier found for state: ${state}`);
    }
    return verifier;
  }

  private isConfigured(): boolean {
    return Boolean(
      this.clientId &&
        this.teamId &&
        this.keyId &&
        this.privateKey &&
        this.redirectUri,
    );
  }
}
