import { Module } from '@nestjs/common';
import { PermissionGuard } from './guards/permission.guard';
import { PermissionsModule } from '@modules/permissions/permissions.module';

/**
 * CommonModule provides reusable features that need to be explicitly imported.
 * Unlike SharedModule, this is NOT global and must be imported where needed.
 *
 * Current Implementation:
 * 1. Guards:
 *    ✓ PermissionGuard - Resource-based access control
 *
 * 2. Utilities:
 *    ✓ Common DTOs - Base data transfer objects
 *    ✓ Common Interfaces - Shared contracts
 *
 * Planned Features:
 * 1. Guards:
 *    - RoleGuard - Role-based access control
 *    - PolicyGuard - Fine-grained policy enforcement
 *    - ResourceGuard - Resource ownership validation
 *
 * 2. Pipes:
 *    - CustomValidationPipe - Enhanced input validation
 *    - ParseIntWithMessagePipe - Integer parsing with custom errors
 *    - ParseBoolWithMessagePipe - Boolean parsing with custom errors
 *
 * 3. Services:
 *    - DateService - Date manipulation and formatting
 *    - FormatService - Data formatting utilities
 *    - ValidationService - Common validation rules
 *
 * 4. Utilities:
 *    - Common Decorators - Reusable metadata decorators
 *    - Common Constants - Shared constant values
 *    - Common Types - Shared TypeScript types
 *
 * Usage Example:
 * ```typescript
 * @Module({
 *   imports: [
 *     CommonModule, // Import to use permission guards and utilities
 *   ],
 * })
 * export class FeatureModule {}
 * ```
 */
@Module({
  imports: [PermissionsModule],
  providers: [PermissionGuard],
  exports: [PermissionGuard],
})
export class CommonModule {}
