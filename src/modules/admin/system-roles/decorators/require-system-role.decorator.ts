import { applyDecorators, UseGuards, SetMetadata } from '@nestjs/common';
import { SystemAdminGuard } from '../guards/system-admin.guard';

/**
 * Decorator to require a specific system role
 * @param role The required system role
 */
export const RequireSystemRole = (role: string) =>
  applyDecorators(SetMetadata('systemRole', role), UseGuards(SystemAdminGuard));
