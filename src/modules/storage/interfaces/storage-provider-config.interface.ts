import {
  StorageProviderConfig,
  StorageProviderType,
} from './storage-config.interface';

/**
 * Provider configuration entity
 */
export interface StorageProviderConfigEntity {
  id: number;
  name: string;
  type: StorageProviderType;
  organizationId: number;
  isDefault: boolean;
  config: StorageProviderConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Project-provider configuration entity
 */
export interface ProjectStorageConfigEntity {
  id: number;
  projectId: number;
  providerConfigId: number;
  isDefault: boolean;
  pathPrefix?: string;
  quotaLimit?: bigint | null;
  createdAt: Date;
  updatedAt: Date;
  providerConfig?: StorageProviderConfigEntity;
}

/**
 * Create storage provider config DTO
 */
export interface CreateStorageProviderConfigDto {
  name: string;
  type: StorageProviderType;
  organizationId?: number;
  isDefault?: boolean;
  config: StorageProviderConfig;
}

/**
 * Update storage provider config DTO
 */
export interface UpdateStorageProviderConfigDto {
  name?: string;
  isDefault?: boolean;
  config?: StorageProviderConfig;
}

/**
 * Create project storage config DTO
 */
export interface CreateProjectStorageConfigDto {
  projectId: number;
  providerConfigId: number;
  isDefault?: boolean;
  pathPrefix?: string;
  quotaLimit?: bigint | null;
}

/**
 * Update project storage config DTO
 */
export interface UpdateProjectStorageConfigDto {
  isDefault?: boolean;
  pathPrefix?: string;
  quotaLimit?: bigint | null;
}

/**
 * Storage provider config repository interface
 */
export interface IStorageProviderConfigRepository {
  /**
   * Create a new storage provider configuration
   */
  createProviderConfig(
    data: CreateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity>;

  /**
   * Find a storage provider configuration by ID
   */
  findProviderConfigById(
    id: number,
  ): Promise<StorageProviderConfigEntity | null>;

  /**
   * Find storage provider configurations by organization ID
   * If organizationId is not provided, uses the tenant context
   */
  findProviderConfigsByOrganizationId(
    organizationId?: number,
  ): Promise<StorageProviderConfigEntity[]>;

  /**
   * Find default storage provider configuration for an organization
   * If organizationId is not provided, uses the tenant context
   */
  findDefaultProviderConfigForOrganization(
    organizationId?: number,
  ): Promise<StorageProviderConfigEntity | null>;

  /**
   * Update a storage provider configuration
   */
  updateProviderConfig(
    id: number,
    data: UpdateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity>;

  /**
   * Delete a storage provider configuration
   */
  deleteProviderConfig(id: number): Promise<void>;

  /**
   * Create a new project storage configuration
   */
  createProjectConfig(
    data: CreateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity>;

  /**
   * Find project storage configurations by project ID
   */
  findProjectConfigsByProjectId(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity[]>;

  /**
   * Find default storage provider configuration for a project
   */
  findDefaultProviderConfigForProject(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity | null>;

  /**
   * Find a specific project-provider mapping
   */
  findProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<ProjectStorageConfigEntity | null>;

  /**
   * Update a project storage configuration
   */
  updateProjectConfig(
    projectId: number,
    providerConfigId: number,
    data: UpdateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity>;

  /**
   * Delete a project storage configuration
   */
  deleteProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<void>;
}
