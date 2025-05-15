import {
  CreateProjectStorageConfigDto,
  CreateStorageProviderConfigDto,
  ProjectStorageConfigEntity,
  StorageProviderConfigEntity,
  UpdateProjectStorageConfigDto,
  UpdateStorageProviderConfigDto,
} from './storage-provider-config.interface';

/**
 * Provider configuration service interface
 */
export interface IStorageProviderConfigService {
  /**
   * Create a new storage provider configuration
   */
  createProviderConfig(
    data: CreateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity>;

  /**
   * Get a provider configuration by ID
   */
  getProviderConfigById(
    id: number,
  ): Promise<StorageProviderConfigEntity | null>;

  /**
   * Get all provider configurations for an organization
   */
  getProviderConfigsByOrganization(): Promise<StorageProviderConfigEntity[]>;

  /**
   * Get the default provider configuration for an organization
   */
  getDefaultProviderConfig(): Promise<StorageProviderConfigEntity | null>;

  /**
   * Update a provider configuration
   */
  updateProviderConfig(
    id: number,
    data: UpdateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity>;

  /**
   * Delete a provider configuration
   */
  deleteProviderConfig(id: number): Promise<void>;

  /**
   * Associate a storage provider configuration with a project
   */
  createProjectConfig(
    data: CreateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity>;

  /**
   * Get all storage configurations for a project
   */
  getProjectConfigs(projectId: number): Promise<ProjectStorageConfigEntity[]>;

  /**
   * Get the default storage configuration for a project
   */
  getDefaultProjectConfig(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity | null>;

  /**
   * Update a project's storage configuration
   */
  updateProjectConfig(
    projectId: number,
    providerConfigId: number,
    data: UpdateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity>;

  /**
   * Remove a storage configuration from a project
   */
  deleteProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<void>;
}
