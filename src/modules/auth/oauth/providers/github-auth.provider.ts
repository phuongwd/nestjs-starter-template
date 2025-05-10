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
  GitHubEmail,
  GitHubUserProfile,
  OAuthPlatform,
  TokenResponse,
} from '../interfaces/oauth.interface';
import axios, { AxiosError } from 'axios';

interface GitHubTokenResponse extends TokenResponse {
  error?: string;
  error_description?: string;
}

@Injectable()
export class GitHubAuthProvider implements IOAuthProvider {
  private readonly logger = new Logger(GitHubAuthProvider.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
  private readonly GITHUB_TOKEN_URL =
    'https://github.com/login/oauth/access_token';
  private readonly GITHUB_API_URL = 'https://api.github.com';

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get('GITHUB_CLIENT_ID') ?? '';
    this.clientSecret = this.configService.get('GITHUB_CLIENT_SECRET') ?? '';
    this.redirectUri = this.configService.get('GITHUB_REDIRECT_URI') ?? '';
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GitHub OAuth is not configured');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'read:user user:email',
      state,
    });

    return `${this.GITHUB_AUTH_URL}?${params.toString()}`;
  }

  async handleCallback(
    code: string,
    state: string,
    _platform?: OAuthPlatform, // Prefix with underscore to indicate intentionally unused
  ): Promise<OAuthUserProfile> {
    if (!this.isConfigured()) {
      throw new Error('GitHub OAuth is not configured');
    }

    if (!code || !state) {
      throw new BadRequestException('Code and state parameters are required');
    }

    try {
      // 1. Exchange code for access token
      const tokens = await this.exchangeCodeForTokens(code);

      // 2. Get user profile and email
      const [profile, emails] = await Promise.all([
        this.getUserProfile(tokens.access_token),
        this.getUserEmails(tokens.access_token),
      ]);

      // 3. Get primary email
      const primaryEmail = emails.find(
        (email: GitHubEmail) => email.primary && email.verified,
      );

      if (!primaryEmail) {
        throw new UnauthorizedException('No verified primary email found');
      }

      // 4. Transform to our standard profile format
      const userProfile: OAuthUserProfile = {
        provider: 'github',
        id: profile.id.toString(),
        email: primaryEmail.email,
        firstName: profile.name?.split(' ')[0] || profile.login || '',
        lastName: profile.name?.split(' ').slice(1).join(' ') || '',
        avatar: profile.avatar_url,
      };

      return userProfile;
    } catch (error) {
      this.logger.error('GitHub authentication failed', {
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
            throw new UnauthorizedException('Access denied by GitHub');
          default:
            throw new BadRequestException('Failed to authenticate with GitHub');
        }
      }

      throw new BadRequestException('Failed to authenticate with GitHub');
    }
  }

  private async exchangeCodeForTokens(code: string): Promise<TokenResponse> {
    try {
      const response = await axios.post<GitHubTokenResponse>(
        this.GITHUB_TOKEN_URL,
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        },
        {
          headers: { Accept: 'application/json' },
        },
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }

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
  ): Promise<GitHubUserProfile> {
    try {
      const response = await axios.get<GitHubUserProfile>(
        `${this.GITHUB_API_URL}/user`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user profile', {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  private async getUserEmails(accessToken: string): Promise<GitHubEmail[]> {
    try {
      const response = await axios.get<GitHubEmail[]>(
        `${this.GITHUB_API_URL}/user/emails`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to get user emails', {
        error: error instanceof Error ? error.stack : String(error),
      });
      throw error;
    }
  }

  private isConfigured(): boolean {
    return Boolean(this.clientId && this.clientSecret && this.redirectUri);
  }
}
