export interface Permission {
  id?: number;
  name: string;
  description?: string;
  resourceType: string;
  action: string;
}

export interface Role {
  id?: number;
  name: string;
  description?: string;
  organizationId?: number;
  isSystemRole?: boolean;
  permissions?: Permission[];
}

export interface OrganizationMember {
  id?: number;
  organizationId: number;
  userId: number;
  status: MemberStatus;
  roles?: Role[];
}

export enum MemberStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING_REGISTRATION = 'PENDING_REGISTRATION',
}

export interface RequiredPermission {
  action: string;
  resource: string;
  conditions?: Record<string, string | number | boolean | null>;
}
