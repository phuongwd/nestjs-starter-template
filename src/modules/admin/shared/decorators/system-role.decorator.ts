import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to specify required system role for an endpoint
 * @param role The required system role name
 */
export const RequireSystemRole = (role: string) =>
  SetMetadata('systemRole', role);
