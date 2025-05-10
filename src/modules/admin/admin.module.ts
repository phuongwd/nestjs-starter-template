import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SubscriptionAdminModule } from './subscription/subscription-admin.module';
import { SystemRolesModule } from './system-roles/system-roles.module';
import { AdminSessionModule } from './sessions/admin-session.module';
import { AdminAuditModule } from './audit/admin-audit.module';
import { AdminOrganizationModule } from './organizations/admin-organization.module';
import { AdminMonitoringModule } from './monitoring/monitoring.module';

/**
 * Root admin module that consolidates all admin-related functionality
 * Each submodule handles specific administrative features
 */
@Module({
  imports: [
    ConfigModule,
    SubscriptionAdminModule,
    SystemRolesModule,
    AdminSessionModule,
    AdminAuditModule,
    AdminOrganizationModule,
    AdminMonitoringModule,
  ],
  exports: [
    SubscriptionAdminModule,
    SystemRolesModule,
    AdminSessionModule,
    AdminAuditModule,
    AdminOrganizationModule,
    AdminMonitoringModule,
  ],
})
export class AdminModule {}
