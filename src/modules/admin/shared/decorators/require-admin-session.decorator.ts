import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { AdminSessionGuard } from '../../sessions/guards/admin-session.guard';

/**
 * Decorator that requires a valid admin session
 * Can be used on controllers or individual routes
 *
 * @example
 * ```typescript
 * @RequireAdminSession()
 * @Controller('admin/users')
 * export class AdminUserController {}
 * ```
 */
export function RequireAdminSession() {
  return applyDecorators(
    UseGuards(AdminSessionGuard),
    ApiBearerAuth(),
    ApiHeader({
      name: 'x-admin-session',
      description: 'Admin session token',
      required: false,
    }),
  );
}
