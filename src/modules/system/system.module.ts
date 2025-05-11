import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '@/prisma/prisma.module';
import { SystemInitService } from './system-init.service';
import { SetupService } from './setup/services/setup.service';
import { SetupTokenRepository } from './setup/repositories/setup-token.repository';
import { SetupController } from './setup/controllers/setup.controller';
import { SETUP_TOKENS } from './setup/constants/setup.constants';
import { ThrottlerModule } from '@nestjs/throttler';
import { SecurityContextService } from './setup/services/security-context.service';
import { SetupAuditInterceptor } from './setup/interceptors/setup-audit.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaService } from '@/prisma/prisma.service';
import { ISetupTokenRepository } from './setup/interfaces/setup-token.interface';
import { PasswordService } from '@/modules/users/services/password.service';
import { UsersModule } from '@/modules/users/users.module';

/**
 * System Module
 * @description Handles system-wide operations, setup, and initialization
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    UsersModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 3,
      },
    ]),
  ],
  controllers: [SetupController],
  providers: [
    SystemInitService,
    SecurityContextService,
    SetupTokenRepository,
    {
      provide: SETUP_TOKENS.REPOSITORY.SETUP_TOKEN,
      useClass: SetupTokenRepository,
    },
    {
      provide: SETUP_TOKENS.SERVICE.SETUP,
      useFactory: (
        prisma: PrismaService,
        config: ConfigService,
        repository: ISetupTokenRepository,
        passwordService: PasswordService,
      ) => {
        return new SetupService(prisma, config, repository, passwordService);
      },
      inject: [
        PrismaService,
        ConfigService,
        SETUP_TOKENS.REPOSITORY.SETUP_TOKEN,
        PasswordService,
      ],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SetupAuditInterceptor,
    },
  ],
  exports: [SystemInitService, SETUP_TOKENS.SERVICE.SETUP],
})
export class SystemModule {}
