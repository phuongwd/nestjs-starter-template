import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IOAuthProvider } from '../interfaces/oauth.interface';
import { GoogleAuthProvider } from '../providers/google-auth.provider';
import { GitHubAuthProvider } from '../providers/github-auth.provider';
import { MicrosoftAuthProvider } from '../providers/microsoft-auth.provider';
import { AppleAuthProvider } from '../providers/apple-auth.provider';

@Injectable()
export class OAuthProviderService {
  private readonly logger = new Logger(OAuthProviderService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly googleAuthProvider: GoogleAuthProvider,
    private readonly githubAuthProvider: GitHubAuthProvider,
    private readonly microsoftAuthProvider: MicrosoftAuthProvider,
    private readonly appleAuthProvider: AppleAuthProvider,
  ) {}

  getProviders(): Map<string, IOAuthProvider> {
    const providers = new Map<string, IOAuthProvider>();

    // Add Google provider if configured
    if (
      this.configService.get('GOOGLE_CLIENT_ID') &&
      this.configService.get('GOOGLE_CLIENT_SECRET')
    ) {
      providers.set('google', this.googleAuthProvider);
      this.logger.log('Google OAuth provider initialized');
    }

    // Add GitHub provider if configured
    if (
      this.configService.get('GITHUB_CLIENT_ID') &&
      this.configService.get('GITHUB_CLIENT_SECRET')
    ) {
      providers.set('github', this.githubAuthProvider);
      this.logger.log('GitHub OAuth provider initialized');
    }

    // Add Microsoft provider if configured
    if (
      this.configService.get('MICROSOFT_CLIENT_ID') &&
      this.configService.get('MICROSOFT_CLIENT_SECRET') &&
      this.configService.get('MICROSOFT_TENANT_ID')
    ) {
      providers.set('microsoft', this.microsoftAuthProvider);
      this.logger.log('Microsoft OAuth provider initialized');
    }

    // Add Apple provider if configured
    if (
      this.configService.get('APPLE_CLIENT_ID') &&
      this.configService.get('APPLE_TEAM_ID') &&
      this.configService.get('APPLE_KEY_ID') &&
      this.configService.get('APPLE_PRIVATE_KEY')
    ) {
      providers.set('apple', this.appleAuthProvider);
      this.logger.log('Apple OAuth provider initialized');
    }

    return providers;
  }

  hasProviders(): boolean {
    return this.getProviders().size > 0;
  }

  getProvider(provider: string): IOAuthProvider | undefined {
    return this.getProviders().get(provider);
  }
}
