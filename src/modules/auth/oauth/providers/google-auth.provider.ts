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
  GoogleUserProfile,
  TokenResponse,
} from '../interfaces/oauth.interface';
import axios, { AxiosError } from 'axios';

@Injectable()
export class GoogleAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(GoogleAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly GOOGLE_AUTH_URL =
    'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_USERINFO_URL =
    'https://www.googleapis.com/oauth2/v3/userinfo';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get('GOOGLE_CLIENT_ID') ?? '';
    this.clientSecret = this.configService.get('GOOGLE_CLIENT_SECRET') ?? '';
    this.redirectUri = this.configService.get('GOOGLE_REDIRECT_URI') ?? '';
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'email profile',
      state,
      access_type: 'offline',
      prompt: 'consent',
    });

    return `${this.GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<OAuthUserProfile> {
    if (!this.isConfigured()) {
      throw new Error('Google OAuth is not configured');
    }

    if (!code || !state) {
      throw new BadRequestException('Code and state parameters are required');
    }

    try {
      // 1. Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(code);

      // 2. Get user profile
      const profile = await this.getUserProfile(tokens.access_token);

      // Validate required fields
      if (!profile.email || !profile.email_verified) {
        throw new UnauthorizedException('Email verification required');
      }

      // 3. Transform to our standard profile format
      return {
        provider: 'google',
        id: profile.sub,
        email: profile.email,
        firstName: profile.given_name || profile.name?.split(' ')[0] || '',
        lastName:
          profile.family_name ||
          profile.name?.split(' ').slice(1).join(' ') ||
          '',
        avatar: profile.picture,
      };
    } catch (error) {
      this.logger.error('Google authentication failed', {
        error: error instanceof Error ? error.stack : error,
        code: error instanceof AxiosError ? error.response?.status : undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
      });

      if (error instanceof AxiosError) {
        switch (error.response?.status) {
          case 401:
            throw new UnauthorizedException(
              'Invalid authentication credentials',
            );
          case 403:
            throw new UnauthorizedException('Access denied by Google');
          default:
            throw new BadRequestException('Failed to authenticate with Google');
        }
      }

      throw new BadRequestException('Failed to authenticate with Google');
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      const params = new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code,
      });

      const response = await axios.post(
        this.GOOGLE_TOKEN_URL,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', {
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }
  }

  private async getUserProfile(
    accessToken: string,
  ): Promise<GoogleUserProfile> {
    try {
      const response = await axios.get(this.GOOGLE_USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }
}
