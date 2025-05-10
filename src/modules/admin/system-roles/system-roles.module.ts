import { Module } from '@nestjs/common';
import { SystemRoleService } from './services/system-role.service';
import { SystemRoleRepository } from './repositories/system-role.repository';
import { SystemRoleController } from './controllers/system-role.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { SystemAdminGuard } from './guards/system-admin.guard';

/**
 * Module for managing system roles
 *
 * Dependencies:
 * - PrismaModule: For database access
 *
 * Provides:
 * - SystemRoleService: For managing system roles
 * - SystemAdminGuard: For protecting admin routes
 */
@Module({
  imports: [PrismaModule],
  controllers: [SystemRoleController],
  providers: [SystemRoleService, SystemRoleRepository, SystemAdminGuard],
  exports: [SystemRoleService, SystemAdminGuard],
})
export class SystemRolesModule {}
