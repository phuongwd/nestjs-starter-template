import { Module } from '@nestjs/common';
import { AccessTokenService } from './services/access-token.service';
import { AccessTokenController } from './controllers/access-token.controller';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PrismaModule } from '@/prisma/prisma.module';
import { AccessTokenRepository } from './repositories/access-token.repository';
import { ACCESS_TOKEN_INJECTION_TOKENS } from './constants/injection-tokens';

/**
 * @module AccessTokensModule
 * @description Module for API access token management
 * Provides token creation, validation, and authentication
 */
@Module({
  imports: [PrismaModule],
  controllers: [AccessTokenController],
  providers: [
    // Repository layer
    {
      provide: ACCESS_TOKEN_INJECTION_TOKENS.REPOSITORY.ACCESS_TOKEN,
      useClass: AccessTokenRepository,
    },
    // Service layer
    {
      provide: ACCESS_TOKEN_INJECTION_TOKENS.SERVICE.ACCESS_TOKEN,
      useClass: AccessTokenService,
    },
    // Guards
    {
      provide: ACCESS_TOKEN_INJECTION_TOKENS.GUARD.ACCESS_TOKEN,
      useClass: AccessTokenGuard,
    },
  ],
  exports: [
    // Export services and guards for use in other modules
    {
      provide: ACCESS_TOKEN_INJECTION_TOKENS.SERVICE.ACCESS_TOKEN,
      useClass: AccessTokenService,
    },
    {
      provide: ACCESS_TOKEN_INJECTION_TOKENS.GUARD.ACCESS_TOKEN,
      useClass: AccessTokenGuard,
    },
  ],
})
export class AccessTokensModule {}
