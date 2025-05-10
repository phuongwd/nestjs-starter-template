import { Module } from '@nestjs/common';
import { AdminOrganizationController } from './controllers/admin-organization.controller';
import { AdminOrganizationService } from './services/admin-organization.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { AdminSharedModule } from '../shared/admin-shared.module';
import { SystemRolesModule } from '../system-roles/system-roles.module';
import { AdminSessionModule } from '../sessions/admin-session.module';
import { OrganizationsModule } from '@/modules/organizations/organizations.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

/**
 * Module for handling administrative organization management
 * Includes organization creation, updates, and system-wide organization operations
 *
 * Dependencies:
 * - OrganizationsModule: For core organization functionality
 * - PrismaModule: For database access
 * - SystemRolesModule: For admin role validation
 * - AdminSessionModule: For admin session validation
 * - AdminAuditModule: For audit logging
 * - AdminSharedModule: For shared utilities
 */
@Module({
  imports: [
    OrganizationsModule,
    PrismaModule,
    SystemRolesModule,
    AdminSessionModule,
    AdminAuditModule,
    AdminSharedModule,
  ],
  controllers: [AdminOrganizationController],
  providers: [AdminOrganizationService],
  exports: [AdminOrganizationService],
})
export class AdminOrganizationModule {}
