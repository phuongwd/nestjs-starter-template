import { Module } from '@nestjs/common';
import { AdminAuditService } from './services/admin-audit.service';
import { AdminAuditRepository } from './repositories/admin-audit.repository';
import { INJECTION_TOKENS } from '../shared/constants/injection-tokens';
import { PrismaModule } from '@/prisma/prisma.module';

/**
 * Module for handling administrative audit logging
 * Tracks and logs administrative actions for security and compliance
 *
 * Dependencies:
 * - PrismaModule: For database access
 */
@Module({
  imports: [PrismaModule],
  providers: [
    AdminAuditService,
    {
      provide: INJECTION_TOKENS.REPOSITORY.ADMIN_AUDIT,
      useClass: AdminAuditRepository,
    },
  ],
  exports: [AdminAuditService],
})
export class AdminAuditModule {}
