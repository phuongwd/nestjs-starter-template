export const RESOURCE_TYPES = {
  USER: 'user',
  ORGANIZATION: 'organization',
  ROLE: 'role',
  MEMBER: 'member',
  SUBSCRIPTION: 'subscription', // Subscription management
  MONITORING: 'monitoring', // System monitoring and metrics
  PROJECT: 'project', // Project management
  PLATFORM: 'platform', // Platform management
  PLATFORM_KEY: 'platform_key', // Platform API keys
} as const;

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE: 'manage', // Special permission for full access to a resource
  INVITE: 'invite',
  ASSIGN: 'assign',
  VIEW: 'view',
  UPDATE_STATUS: 'update_status',
  ADD_NOTE: 'add_note',
  CONFIGURE: 'configure', // For platform and project settings
  DEPLOY: 'deploy', // For platform and project deployment
  PUBLISH: 'publish', // For releasing platform/project versions
  ROLLBACK: 'rollback', // For reverting platform/project versions
  LINK: 'link', // For linking projects to platforms
  UNLINK: 'unlink', // For unlinking projects from platforms
} as const;

export const DEFAULT_PERMISSIONS = [
  // User permissions
  {
    name: `${RESOURCE_TYPES.USER}:${ACTIONS.CREATE}`,
    description: 'Can create users',
    resourceType: RESOURCE_TYPES.USER,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.USER}:${ACTIONS.READ}`,
    description: 'Can read user information',
    resourceType: RESOURCE_TYPES.USER,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.USER}:${ACTIONS.UPDATE}`,
    description: 'Can update user information',
    resourceType: RESOURCE_TYPES.USER,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.USER}:${ACTIONS.DELETE}`,
    description: 'Can delete users',
    resourceType: RESOURCE_TYPES.USER,
    action: ACTIONS.DELETE,
  },

  // Organization permissions
  {
    name: `${RESOURCE_TYPES.ORGANIZATION}:${ACTIONS.CREATE}`,
    description: 'Can create organizations',
    resourceType: RESOURCE_TYPES.ORGANIZATION,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.ORGANIZATION}:${ACTIONS.READ}`,
    description: 'Can read organization information',
    resourceType: RESOURCE_TYPES.ORGANIZATION,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.ORGANIZATION}:${ACTIONS.UPDATE}`,
    description: 'Can update organization information',
    resourceType: RESOURCE_TYPES.ORGANIZATION,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.ORGANIZATION}:${ACTIONS.DELETE}`,
    description: 'Can delete organizations',
    resourceType: RESOURCE_TYPES.ORGANIZATION,
    action: ACTIONS.DELETE,
  },

  // Member permissions
  {
    name: `${RESOURCE_TYPES.MEMBER}:${ACTIONS.INVITE}`,
    description: 'Can invite members to organization',
    resourceType: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.INVITE,
  },
  {
    name: `${RESOURCE_TYPES.MEMBER}:${ACTIONS.READ}`,
    description: 'Can read member information',
    resourceType: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.MEMBER}:${ACTIONS.UPDATE}`,
    description: 'Can update member information',
    resourceType: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.MEMBER}:${ACTIONS.DELETE}`,
    description: 'Can remove members from organization',
    resourceType: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.DELETE,
  },
  {
    name: `${RESOURCE_TYPES.MEMBER}:${ACTIONS.ASSIGN}`,
    description: 'Can assign roles to members',
    resourceType: RESOURCE_TYPES.MEMBER,
    action: ACTIONS.ASSIGN,
  },

  // Role permissions
  {
    name: `${RESOURCE_TYPES.ROLE}:${ACTIONS.CREATE}`,
    description: 'Can create roles',
    resourceType: RESOURCE_TYPES.ROLE,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.ROLE}:${ACTIONS.READ}`,
    description: 'Can read role information',
    resourceType: RESOURCE_TYPES.ROLE,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.ROLE}:${ACTIONS.UPDATE}`,
    description: 'Can update role information',
    resourceType: RESOURCE_TYPES.ROLE,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.ROLE}:${ACTIONS.DELETE}`,
    description: 'Can delete roles',
    resourceType: RESOURCE_TYPES.ROLE,
    action: ACTIONS.DELETE,
  },

  // Subscription permissions
  {
    name: `${RESOURCE_TYPES.SUBSCRIPTION}:${ACTIONS.VIEW}`,
    description: 'Can view subscription information',
    resourceType: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.VIEW,
  },
  {
    name: `${RESOURCE_TYPES.SUBSCRIPTION}:${ACTIONS.UPDATE_STATUS}`,
    description: 'Can update subscription status',
    resourceType: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.UPDATE_STATUS,
  },
  {
    name: `${RESOURCE_TYPES.SUBSCRIPTION}:${ACTIONS.ADD_NOTE}`,
    description: 'Can add notes to subscriptions',
    resourceType: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.ADD_NOTE,
  },
  {
    name: `${RESOURCE_TYPES.SUBSCRIPTION}:${ACTIONS.MANAGE}`,
    description: 'Can manage all subscription aspects',
    resourceType: RESOURCE_TYPES.SUBSCRIPTION,
    action: ACTIONS.MANAGE,
  },

  // Monitoring permissions
  {
    name: `${RESOURCE_TYPES.MONITORING}:${ACTIONS.READ}`,
    description: 'Can read monitoring metrics and health status',
    resourceType: RESOURCE_TYPES.MONITORING,
    action: ACTIONS.READ,
  },

  // Platform permissions
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.CREATE}`,
    description: 'Can create platforms',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.READ}`,
    description: 'Can read platform information',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.UPDATE}`,
    description: 'Can update platform information',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.DELETE}`,
    description: 'Can delete platforms',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.DELETE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.MANAGE}`,
    description: 'Can manage all platform aspects',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.MANAGE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.CONFIGURE}`,
    description: 'Can configure platform settings',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.CONFIGURE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.DEPLOY}`,
    description: 'Can deploy platform changes',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.DEPLOY,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.PUBLISH}`,
    description: 'Can publish platform versions',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.PUBLISH,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM}:${ACTIONS.ROLLBACK}`,
    description: 'Can rollback platform versions',
    resourceType: RESOURCE_TYPES.PLATFORM,
    action: ACTIONS.ROLLBACK,
  },

  // Platform Key permissions
  {
    name: `${RESOURCE_TYPES.PLATFORM_KEY}:${ACTIONS.CREATE}`,
    description: 'Can create platform API keys',
    resourceType: RESOURCE_TYPES.PLATFORM_KEY,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM_KEY}:${ACTIONS.READ}`,
    description: 'Can read platform API keys',
    resourceType: RESOURCE_TYPES.PLATFORM_KEY,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM_KEY}:${ACTIONS.UPDATE}`,
    description: 'Can update platform API keys',
    resourceType: RESOURCE_TYPES.PLATFORM_KEY,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.PLATFORM_KEY}:${ACTIONS.DELETE}`,
    description: 'Can delete platform API keys',
    resourceType: RESOURCE_TYPES.PLATFORM_KEY,
    action: ACTIONS.DELETE,
  },

  // Enhanced Project permissions
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.CREATE}`,
    description: 'Can create projects',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.CREATE,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.READ}`,
    description: 'Can read project information',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.READ,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.UPDATE}`,
    description: 'Can update project information',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.UPDATE,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.DELETE}`,
    description: 'Can delete projects',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.DELETE,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.MANAGE}`,
    description: 'Can manage all project aspects',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.MANAGE,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.CONFIGURE}`,
    description: 'Can configure project settings',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.CONFIGURE,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.DEPLOY}`,
    description: 'Can deploy project changes',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.DEPLOY,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.PUBLISH}`,
    description: 'Can publish project versions',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.PUBLISH,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.ROLLBACK}`,
    description: 'Can rollback project versions',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.ROLLBACK,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.LINK}`,
    description: 'Can link project to platforms',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.LINK,
  },
  {
    name: `${RESOURCE_TYPES.PROJECT}:${ACTIONS.UNLINK}`,
    description: 'Can unlink project from platforms',
    resourceType: RESOURCE_TYPES.PROJECT,
    action: ACTIONS.UNLINK,
  },
] as const;
