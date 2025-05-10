import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { FeatureFlagGuard } from './guards/feature-flag.guard';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionCheckerService } from './services/permission-checker.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsModule } from '../modules/organizations/organizations.module';
import { SystemRolesModule } from '../modules/admin/system-roles/system-roles.module';
import { CustomThrottlerGuard } from './guards/throttler.guard';

/**
 * SharedModule provides application-wide (global) features.
 * This module is marked as @Global() so its providers are available everywhere
 * without needing to import the module.
 *
 * Current Implementation:
 * 1. Global Guards (in order of execution):
 *    ✓ ThrottlerGuard - Rate limiting (first line of defense)
 *    ✓ JwtAuthGuard - Authentication (verify user identity)
 *    ✓ PermissionGuard - Authorization (verify user permissions)
 *    ✓ FeatureFlagGuard - Feature availability (last, after auth)
 *
 * Planned Features:
 * 1. Global Filters:
 *    - HttpExceptionFilter - Standardize error responses
 *    - ValidationExceptionFilter - Handle validation errors
 *    - PrismaExceptionFilter - Map database errors
 *
 * 2. Global Services:
 *    - LoggerService - Centralized logging
 *    - CacheService - Response caching
 *    - EventEmitterService - Event handling
 *
 * 3. Global Interceptors:
 *    - TimeoutInterceptor - Request timeout handling
 *    - CacheInterceptor - Response caching
 *    - LoggingInterceptor - Request/Response logging
 *
 * Note: For reusable but non-global features, use CommonModule instead.
 */
@Global()
@Module({
  imports: [OrganizationsModule, SystemRolesModule],
  providers: [
    // 1. Rate Limiting (First in chain)
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    // 2. Authentication
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    // 3. Authorization
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
    // 4. Feature Flags (Last in chain)
    {
      provide: APP_GUARD,
      useClass: FeatureFlagGuard,
    },
    PermissionCheckerService,
    PrismaService,
  ],
  exports: [PermissionCheckerService, OrganizationsModule],
})
export class SharedModule {}
