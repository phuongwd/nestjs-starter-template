import { ApiProperty } from '@nestjs/swagger';
import { ActivityMetadata } from './activity-metadata.types';
import { OrganizationMember, MemberRole, Role, User } from '@prisma/client';

export class OrganizationRoleResponse {
  @ApiProperty({ description: 'Role ID' })
  id: number;

  @ApiProperty({ description: 'Role name' })
  name: string;

  @ApiProperty({ description: 'Role description' })
  description?: string;

  constructor(role: Role) {
    this.id = role.id;
    this.name = role.name;
    this.description = role.description || undefined;
  }
}

export class MemberResponse {
  @ApiProperty({ description: 'Member ID' })
  id: number;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: number;

  @ApiProperty({ description: 'User ID if member has registered' })
  userId: number | null;

  @ApiProperty({ description: 'Member email address' })
  email: string;

  @ApiProperty({ description: 'Member status' })
  status: string;

  @ApiProperty({ description: 'Member first name' })
  firstName: string | null;

  @ApiProperty({ description: 'Member last name' })
  lastName: string | null;

  @ApiProperty({ description: 'Member roles in this organization' })
  roles: OrganizationRoleResponse[];

  @ApiProperty({ description: 'Member creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Member last update timestamp' })
  updatedAt: Date;

  constructor(
    partial: Partial<
      OrganizationMember & {
        roles?: (MemberRole & { role: Role })[];
        user?: User;
      }
    >,
  ) {
    this.id = partial.id!;
    this.organizationId = partial.organizationId!;
    this.userId = partial.userId || null;
    this.email = partial.email!;
    this.status = partial.status!;
    this.firstName = partial.user?.firstName || null;
    this.lastName = partial.user?.lastName || null;
    this.roles =
      partial.roles?.map(
        (memberRole) => new OrganizationRoleResponse(memberRole.role),
      ) || [];
    this.createdAt = partial.createdAt!;
    this.updatedAt = partial.updatedAt!;
  }
}

export class MemberActivityResponse {
  @ApiProperty()
  id: number;

  @ApiProperty()
  organizationId: number;

  @ApiProperty()
  memberId: number;

  @ApiProperty()
  action: string;

  @ApiProperty({
    type: 'object',
    nullable: true,
    description:
      'Activity metadata with specific structure based on activity type',
    additionalProperties: true,
    example: {
      type: 'member_invitation',
      timestamp: '2024-02-21T12:00:00Z',
      invitedBy: 1,
      roles: ['member', 'editor'],
    },
  })
  metadata: ActivityMetadata | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(partial: Partial<MemberActivityResponse>) {
    Object.assign(this, partial);
    this.id = partial.id || 0;
    this.organizationId = partial.organizationId || 0;
    this.memberId = partial.memberId || 0;
    this.action = partial.action || '';
    this.metadata = partial.metadata || null;
    this.createdAt = partial.createdAt || new Date();
    this.updatedAt = partial.updatedAt || new Date();
  }
}

export class MemberListResponse {
  @ApiProperty({ type: [MemberResponse] })
  members: MemberResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  constructor(partial: Partial<MemberListResponse>) {
    Object.assign(this, partial);
    this.members = partial.members || [];
    this.total = partial.total || 0;
    this.page = partial.page || 1;
    this.totalPages = partial.totalPages || 0;
  }
}

export class MemberActivityListResponse {
  @ApiProperty({ type: [MemberActivityResponse] })
  activities: MemberActivityResponse[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  totalPages: number;

  constructor(partial: Partial<MemberActivityListResponse>) {
    Object.assign(this, partial);
    this.activities = partial.activities || [];
    this.total = partial.total || 0;
    this.page = partial.page || 1;
    this.totalPages = partial.totalPages || 0;
  }
}
