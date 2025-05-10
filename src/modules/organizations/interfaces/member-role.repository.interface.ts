import { MemberRole } from '@prisma/client';

export interface IMemberRoleRepository {
  /**
   * Assign roles to a member by role names, handling lookup and assignment
   */
  assignRolesByNames(
    memberId: number,
    roleNames: string[],
    organizationId: number,
  ): Promise<void>;

  /**
   * Assign roles to a member
   */
  assignRoles(memberId: number, roleIds: number[]): Promise<void>;

  /**
   * Get roles for a member
   */
  getRoles(memberId: number): Promise<MemberRole[]>;

  /**
   * Check if member has specific role
   */
  hasRole(memberId: number, roleName: string): Promise<boolean>;

  /**
   * Remove all roles from a member
   */
  removeAllRoles(memberId: number): Promise<void>;

  /**
   * Remove specific role from a member
   */
  removeRole(memberId: number, roleId: number): Promise<void>;

  /**
   * Find members by role
   */
  findMembersByRole(
    organizationId: number,
    roleName: string,
  ): Promise<MemberRole[]>;
}
