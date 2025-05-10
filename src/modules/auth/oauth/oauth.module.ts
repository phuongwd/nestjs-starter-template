import { Module } from '@nestjs/common';
import { GoogleAuthProvider } from './providers/google-auth.provider';
import { GitHubAuthProvider } from './providers/github-auth.provider';
import { MicrosoftAuthProvider } from './providers/microsoft-auth.provider';
import { AppleAuthProvider } from './providers/apple-auth.provider';
import { OAuthProviderService } from './services/oauth-provider.service';
import { OAuthStateService } from './services/oauth-state.service';
import { OAuthUserRepository } from './repositories/oauth-user.repository';
import { OAUTH_INJECTION_TOKENS } from './constants/injection-tokens';
import { RedisModule } from '@/core/redis/redis.module';

@Module({
  imports: [RedisModule],
  providers: [
    // OAuth Providers
    GoogleAuthProvider,
    GitHubAuthProvider,
    MicrosoftAuthProvider,
    AppleAuthProvider,

    // OAuth Services
    OAuthProviderService,
    OAuthStateService,

    // OAuth Repository
    {
      provide: OAUTH_INJECTION_TOKENS.REPOSITORY.OAUTH_USER,
      useClass: OAuthUserRepository,
    },

    // OAuth Provider Map
    {
      provide: OAUTH_INJECTION_TOKENS.PROVIDER.OAUTH,
      useFactory: (oauthProviderService: OAuthProviderService) => {
        return oauthProviderService.getProviders();
      },
      inject: [OAuthProviderService],
    },
  ],
  exports: [
    OAuthStateService,
    OAUTH_INJECTION_TOKENS.PROVIDER.OAUTH,
    OAUTH_INJECTION_TOKENS.REPOSITORY.OAUTH_USER,
  ],
})
export class OAuthModule {}
