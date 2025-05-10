import { Module } from '@nestjs/common';
import { SystemRolesModule } from '../system-roles/system-roles.module';
import { AdminSessionModule } from '../sessions/admin-session.module';
import { AdminAuditModule } from '../audit/admin-audit.module';

/**
 * Shared module for common admin functionality
 * Contains decorators, guards, and other shared utilities
 *
 * This module provides:
 * - Common decorators for admin routes
 * - Shared constants and tokens
 */
@Module({
  imports: [SystemRolesModule, AdminSessionModule, AdminAuditModule],
  providers: [],
  exports: [],
})
export class AdminSharedModule {}
