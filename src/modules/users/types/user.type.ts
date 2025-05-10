import {
  Prisma,
  User,
  SystemRole,
  Role,
  OrganizationMember,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Type for user with hashed password
 * Organization data is intentionally omitted as it's handled by the caching system
 */
export type UserWithHashedPassword = User & {
  systemRoles?: SystemRole[];
  organizationMembers?: OrganizationMember[];
};

/**
 * Type for user without sensitive data
 */
export type UserWithoutPassword = Omit<
  User,
  'password' | 'resetToken' | 'resetTokenExpiresAt'
> & {
  systemRoles?: SystemRole[];
  organizationMembers?: OrganizationMember[];
};

export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;

/**
 * Response DTO for system role
 */
export class SystemRoleResponse {
  @ApiProperty({ description: 'Role ID' })
  id: number;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role description' })
  description?: string;

  @ApiProperty({ description: 'Role permissions' })
  permissions: string[];

  constructor(role: SystemRole) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description || undefined;
    this.permissions = role.permissions as string[];
  }
}

/**
 * Response DTO for organization role
 */
export class OrganizationRoleResponse {
  @ApiProperty({ description: 'Role ID' })
  id: number;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role description' })
  description?: string;

  @ApiProperty({ description: 'Organization ID this role belongs to' })
  organizationId: number;

  constructor(role: Role) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description || undefined;
    this.organizationId = role.organizationId!;
  }
}

/**
 * Response DTO for organization membership
 */
export class OrganizationMemberResponse {
  @ApiProperty({ description: 'Member ID' })
  id: number;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: number;

  @ApiProperty({ description: 'Member status' })
  status: string;

  @ApiProperty({ description: 'Member roles in this organization' })
  roles: OrganizationRoleResponse[];

  constructor(member: OrganizationMember & { roles?: { role: Role }[] }) {
    this.id = member.id;
    this.organizationId = member.organizationId;
    this.status = member.status;
    this.roles =
      member.roles?.map((r) => new OrganizationRoleResponse(r.role)) || [];
  }
}

/**
 * Response DTO for user data
 * Organization data is intentionally omitted as it's handled by the caching system
 * and retrieved separately to maintain data consistency and security
 */
export class UserWithoutPasswordResponse
  implements Partial<UserWithoutPassword>
{
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'User email address' })
  email: string;

  @ApiProperty({ description: 'User first name' })
  firstName: string;

  @ApiProperty({ description: 'User last name' })
  lastName: string;

  @ApiProperty({ description: 'User creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'User last update timestamp' })
  updatedAt: Date;

  @ApiProperty({
    description:
      'System-wide access control roles (only included for admin users)',
    type: [SystemRoleResponse],
    required: false,
  })
  systemAccess?: SystemRoleResponse[];

  @ApiProperty({
    description: 'User memberships across organizations with associated roles',
    type: [OrganizationMemberResponse],
  })
  memberships: OrganizationMemberResponse[];

  constructor(
    partial: Partial<User> & {
      systemRoles?: SystemRole[];
      organizationMembers?: (OrganizationMember & {
        roles?: { role: Role }[];
      })[];
    },
  ) {
    this.id = partial.id!;
    this.email = partial.email!;
    this.firstName = partial.firstName!;
    this.lastName = partial.lastName!;
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;

    // Only include system access if roles exist
    if (partial.systemRoles?.length) {
      this.systemAccess = partial.systemRoles.map(
        (role) => new SystemRoleResponse(role),
      );
    }

    this.memberships = (partial.organizationMembers || []).map(
      (member) => new OrganizationMemberResponse(member),
    );
  }
}
