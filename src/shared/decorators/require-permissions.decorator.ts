import { SetMetadata } from '@nestjs/common';
import { RequiredPermission } from '../types/permission.types';

export const PERMISSIONS_KEY = 'permissions';

export const RequirePermissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Convenience decorators for common operations
export const CanCreate = (resource: string) =>
  RequirePermissions({ action: 'create', resource });

export const CanRead = (resource: string) =>
  RequirePermissions({ action: 'read', resource });

export const CanUpdate = (resource: string) =>
  RequirePermissions({ action: 'update', resource });

export const CanDelete = (resource: string) =>
  RequirePermissions({ action: 'delete', resource });
