import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequiredPermission } from '../types/permission.types';
import {
  ApiOperation,
  ApiResponse,
  ApiUnauthorizedResponse,
  ApiBearerAuth,
  ApiTags,
  ApiHeader,
} from '@nestjs/swagger';
import { PERMISSIONS_KEY } from './require-permissions.decorator';

/**
 * Combined authentication and authorization decorator
 *
 * This decorator provides a comprehensive security layer for endpoints by combining:
 * 1. JWT-based authentication
 * 2. Role-based access control (RBAC)
 * 3. Permission-based authorization
 * 4. Automatic OpenAPI/Swagger documentation
 *
 * The decorator can be applied to both controllers (classes) and individual routes (methods).
 * When applied to a controller, it protects all routes within that controller.
 *
 * Security Features:
 * - JWT token validation
 * - Permission-based access control
 * - Tenant isolation (when applicable)
 * - Request authentication headers validation
 *
 * OpenAPI Documentation:
 * - Automatically adds security schemes
 * - Documents required permissions
 * - Provides standard error responses
 * - Includes authentication requirements
 *
 * @param permissions - Optional array of required permissions to access the endpoint
 * @returns Combined decorator for authentication and authorization
 *
 * @example
 * Basic authentication without permissions:
 * ```typescript
 * @Auth()
 * async findAll() {
 *   // This endpoint requires only authentication
 * }
 * ```
 *
 * Single permission requirement:
 * ```typescript
 * @Auth({ resource: 'users', action: 'read' })
 * async findOne(id: number) {
 *   // This endpoint requires 'read' permission on 'users' resource
 * }
 * ```
 *
 * Multiple permission requirements:
 * ```typescript
 * @Auth(
 *   { resource: 'users', action: 'write' },
 *   { resource: 'roles', action: 'read' }
 * )
 * async updateUserRole(userId: number, roleId: number) {
 *   // This endpoint requires both permissions
 * }
 * ```
 *
 * Controller-level protection:
 * ```typescript
 * @Auth({ resource: 'organizations', action: 'admin' })
 * @Controller('organizations')
 * export class OrganizationsController {
 *   // All routes in this controller require the 'admin' permission
 * }
 * ```
 */
export function Auth(...permissions: RequiredPermission[]) {
  // Core security decorators that work on both classes and methods
  const securityDecorators = [
    UseGuards(JwtAuthGuard, PermissionGuard),
    ApiBearerAuth(),
    ApiHeader({
      name: 'Authorization',
      description: 'JWT Bearer token',
      required: true,
    }),
    ApiTags('Protected Routes'),
    ApiUnauthorizedResponse({
      description: 'Unauthorized - Invalid or missing authentication token',
    }),
    ApiResponse({
      status: 403,
      description:
        'Forbidden - Insufficient permissions or invalid token scope',
    }),
    ApiResponse({
      status: 429,
      description: 'Too Many Requests - Rate limit exceeded',
    }),
  ];

  // Add permission metadata and documentation if permissions are specified
  if (permissions?.length) {
    const permissionDescriptions = permissions
      .map((p) => `${p.resource}:${p.action}`)
      .join(', ');

    securityDecorators.push(
      // Set permissions metadata for authorization
      SetMetadata(PERMISSIONS_KEY, permissions),

      // Enhanced API documentation
      ApiOperation({
        summary: `Protected endpoint requiring permissions: [${permissionDescriptions}]`,
        description: `
This endpoint requires authentication and the following permissions:
${permissions.map((p) => `- ${p.resource}:${p.action}`).join('\n')}

Authentication:
- Requires a valid JWT Bearer token
- Token must have sufficient scope
- Token must not be expired

Authorization:
- User must have all specified permissions
- Permissions are checked against the user's roles
- Organization/tenant context is validated
`,
      }) as MethodDecorator & ClassDecorator,
    );
  }

  return applyDecorators(...securityDecorators);
}
