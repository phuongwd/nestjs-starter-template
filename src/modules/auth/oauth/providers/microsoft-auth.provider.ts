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
  MicrosoftUserProfile,
  TokenResponse,
  OAuthPlatform,
} from '../interfaces/oauth.interface';
import axios, { AxiosError } from 'axios';

@Injectable()
export class MicrosoftAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(MicrosoftAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tenantId: string;
  private readonly redirectUri: string;
  private readonly MICROSOFT_AUTH_URL: string;
  private readonly MICROSOFT_TOKEN_URL: string;
  private readonly MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get('MICROSOFT_CLIENT_ID') ?? '';
    this.clientSecret = this.configService.get('MICROSOFT_CLIENT_SECRET') ?? '';
    this.tenantId = this.configService.get('MICROSOFT_TENANT_ID') ?? 'common';
    this.redirectUri = this.configService.get('MICROSOFT_REDIRECT_URI') ?? '';

    // Initialize URLs after tenantId is set
    this.MICROSOFT_AUTH_URL = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/authorize`;
    this.MICROSOFT_TOKEN_URL = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
  }

  async getAuthorizationUrl(
    state: string,
    platform?: OAuthPlatform,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      response_mode: 'query',
      scope: 'openid profile email User.Read',
      state,
    });

    // Add platform-specific parameters if needed
    if (platform) {
      params.append('platform', platform);
    }

    return `${this.MICROSOFT_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    _platform?: OAuthPlatform,
  ): Promise<OAuthUserProfile> {
    if (!this.isConfigured()) {
      throw new Error('Microsoft OAuth is not configured');
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
      if (!profile.mail && !profile.userPrincipalName) {
        throw new UnauthorizedException('Email is required');
      }

      // 3. Transform to our standard profile format
      const userProfile: OAuthUserProfile = {
        provider: 'microsoft',
        id: profile.id,
        email: profile.mail || profile.userPrincipalName,
        firstName:
          profile.givenName || profile.displayName?.split(' ')[0] || '',
        lastName:
          profile.surname ||
          profile.displayName?.split(' ').slice(1).join(' ') ||
          '',
        avatar: profile.photo,
      };

      return userProfile;
    } catch (error) {
      this.logger.error('Microsoft authentication failed', {
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
            throw new UnauthorizedException('Access denied by Microsoft');
          default:
            throw new BadRequestException(
              'Failed to authenticate with Microsoft',
            );
        }
      }

      throw new BadRequestException('Failed to authenticate with Microsoft');
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

      const response = await axios.post<TokenResponse>(
        this.MICROSOFT_TOKEN_URL,
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens', {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  private async getUserProfile(
    accessToken: string,
  ): Promise<MicrosoftUserProfile> {
    try {
      const response = await axios.get<Omit<MicrosoftUserProfile, 'photo'>>(
        `${this.MICROSOFT_GRAPH_URL}/me`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const profile = { ...response.data };

      // Get user photo if available
      try {
        const photoResponse = await axios.get(
          `${this.MICROSOFT_GRAPH_URL}/me/photo/$value`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            responseType: 'arraybuffer',
          },
        );

        if (photoResponse.data) {
          const photoBase64 = Buffer.from(photoResponse.data).toString(
            'base64',
          );
          return {
            ...profile,
            photo: `data:image/jpeg;base64,${photoBase64}`,
          };
        }
      } catch (photoError) {
        // Photo is optional, so we just log the error and continue
        this.logger.debug('Failed to fetch user photo', {
          error:
            photoError instanceof Error
              ? photoError.message
              : String(photoError),
        });
      }

      return profile;
    } catch (error) {
      this.logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  private isConfigured(): boolean {
    return Boolean(
      this.clientId && this.clientSecret && this.tenantId && this.redirectUri,
    );
  }
}
