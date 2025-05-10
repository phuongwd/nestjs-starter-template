/**
 * @interface Permission
 * @description Interface for permission details
 */
export interface Permission {
  name: string;
  description: string;
  resourceType: string;
  action: string;
}

/**
 * @interface PermissionResponse
 * @description Interface for permission response from API
 */
export interface PermissionResponse {
  name: string;
  description: string;
  resourceType: string;
  action: string;
}

/**
 * @interface ResourcePermissions
 * @description Interface for permissions grouped by resource
 */
export interface ResourcePermissions {
  name: string;
  permissions: Permission[];
}

/**
 * @type GroupedPermissions
 * @description Type for permissions grouped by resource type
 */
export type GroupedPermissions = Record<string, ResourcePermissions>;

/**
 * @interface Role
 * @description Interface for role details
 */
export interface Role {
  id: number;
  name: string;
  description?: string | null;
  organizationId: number;
  isSystemRole: boolean;
  permissions: PermissionResponse[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * @interface RoleWithPermissions
 * @description Type-safe representation of a role with its permissions
 */
export interface RoleWithPermissions {
  id: number;
  name: string;
  description: string | null;
  organizationId: number | null;
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: Array<{
    permission: {
      id: number;
      name: string;
      resourceType: string;
      action: string;
    };
  }>;
}

/**
 * @interface MemberRole
 * @description Type-safe representation of a member's role assignment
 */
export interface MemberRole {
  role: RoleWithPermissions;
  createdAt: Date;
  memberId: number;
  roleId: number;
}
