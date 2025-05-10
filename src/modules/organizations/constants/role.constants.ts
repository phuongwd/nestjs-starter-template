/**
 * @constant ROLE_NAMES
 * @description Constants for system and organization role names
 */
export const ROLE_NAMES = {
  // System roles
  SYSTEM_ADMIN: 'system_admin',

  // Organization roles
  ORG_ADMIN: 'org_admin',
  BILLING_MANAGER: 'billing_manager',
} as const;

/**
 * @constant ROLE_DESCRIPTIONS
 * @description Descriptions for system and organization roles
 */
export const ROLE_DESCRIPTIONS = {
  [ROLE_NAMES.SYSTEM_ADMIN]:
    'System administrator with full access to all features',
  [ROLE_NAMES.ORG_ADMIN]:
    'Organization administrator with full access to organization features',
  [ROLE_NAMES.BILLING_MANAGER]:
    'Can manage billing and subscriptions for the organization',
} as const;

/**
 * @type SystemRoleNames
 * @description Type for system role names
 */
export type SystemRoleNames = typeof ROLE_NAMES.SYSTEM_ADMIN;

/**
 * @type OrganizationRoleNames
 * @description Type for organization role names
 */
export type OrganizationRoleNames =
  | typeof ROLE_NAMES.ORG_ADMIN
  | typeof ROLE_NAMES.BILLING_MANAGER;

export default {
  ROLE_NAMES,
  ROLE_DESCRIPTIONS,
};
