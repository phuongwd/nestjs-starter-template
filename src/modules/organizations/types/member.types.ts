import { OrganizationMember, MemberRole, Role, User } from '@prisma/client';

/**
 * Extended type for OrganizationMember with included relations
 */
export type MemberWithRelations = OrganizationMember & {
  user: {
    id: number;
    email: string;
    firstName: string | null;
    lastName: string | null;
  } | null;
  organization: {
    id: number;
    name: string;
    description: string | null;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  };
  roles: (MemberRole & {
    role: Role & {
      permissions: Array<{
        permission: {
          id: number;
          name: string;
          description: string | null;
          resourceType: string;
          action: string;
          createdAt: Date;
        };
      }>;
    };
  })[];
};

export type MemberWithRoles = OrganizationMember & {
  roles: (MemberRole & { role: Role })[];
  user?: User;
};

/**
 * Member status enum to match the database
 */
export const MemberStatus = {
  PENDING_REGISTRATION: 'PENDING_REGISTRATION',
  INVITED: 'INVITED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  REMOVED: 'REMOVED',
} as const;

export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];
