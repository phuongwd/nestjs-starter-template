/**
 * Activity type constants
 */
export const ACTIVITY_TYPES = {
  PROFILE_UPDATE: 'profile_update',
  ROLE_CHANGE: 'role_change',
  PERMISSION_CHANGE: 'permission_change',
  LOGIN: 'login',
  MEMBER_INVITATION: 'member_invitation',
  STATUS_UPDATE: 'status_update',
  MEMBER_REMOVAL: 'member_removal',
  INVITATION_RESPONSE: 'invitation_response',
  REGISTRATION_COMPLETION: 'registration_completion',
  MEMBER_UPDATE: 'member_update',
} as const;

type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];

/**
 * Base metadata interface with common fields
 */
interface BaseActivityMetadata {
  type: ActivityType;
  timestamp: string;
}

/**
 * Metadata for member updates
 */
export interface MemberUpdateMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.MEMBER_UPDATE;
  updatedBy: number;
  changes: Record<string, unknown>;
}

/**
 * Metadata for member removal
 */
export interface MemberRemovalMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.MEMBER_REMOVAL;
  removedBy: number;
  memberEmail?: string | null;
  roles?: string[];
}

/**
 * Metadata for invitation responses
 */
export interface InvitationResponseMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.INVITATION_RESPONSE;
  respondedBy: number;
  accepted: boolean;
}

/**
 * Metadata for role changes
 */
export interface RoleChangeMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.ROLE_CHANGE;
  changedBy: string;
  previousRole: string;
  newRole: string;
}

/**
 * Metadata for member invitations
 */
export interface MemberInvitationMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.MEMBER_INVITATION;
  invitedBy: number;
  email: string;
  roles: string[];
}

/**
 * Metadata for registration completion
 */
export interface RegistrationCompletionMetadata extends BaseActivityMetadata {
  type: typeof ACTIVITY_TYPES.REGISTRATION_COMPLETION;
  email: string;
  completedBy: number;
}

/**
 * Union type of all possible activity metadata types
 */
export type ActivityMetadata =
  | MemberUpdateMetadata
  | MemberRemovalMetadata
  | InvitationResponseMetadata
  | RoleChangeMetadata
  | MemberInvitationMetadata
  | RegistrationCompletionMetadata;
