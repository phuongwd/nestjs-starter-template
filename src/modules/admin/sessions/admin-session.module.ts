import { Module } from '@nestjs/common';
import { AdminSessionService } from './services/admin-session.service';
import { AdminSessionGuard } from './guards/admin-session.guard';
import { AdminSessionRepository } from './repositories/admin-session.repository';
import { AdminSessionController } from './controllers/admin-session.controller';
import { INJECTION_TOKENS } from '../shared/constants/injection-tokens';
import { PrismaModule } from '@/prisma/prisma.module';
import { RedisModule } from '@/core/redis/redis.module';
import { SystemRolesModule } from '../system-roles/system-roles.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

/**
 * Module for handling administrative session management
 * Includes session tracking, validation, and cleanup
 *
 * Dependencies:
 * - PrismaModule: For database access
 * - RedisModule: For session caching
 * - SystemRolesModule: For admin role validation
 * - AdminAuditModule: For audit logging
 */
@Module({
  imports: [PrismaModule, RedisModule, SystemRolesModule, AdminAuditModule],
  controllers: [AdminSessionController],
  providers: [
    AdminSessionService,
    AdminSessionGuard,
    {
      provide: INJECTION_TOKENS.REPOSITORY.ADMIN_SESSION,
      useClass: AdminSessionRepository,
    },
  ],
  exports: [AdminSessionService, AdminSessionGuard],
})
export class AdminSessionModule {}
