import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  CreateProjectStorageConfigDto,
  CreateStorageProviderConfigDto,
  IStorageProviderConfigRepository,
  ProjectStorageConfigEntity,
  StorageProviderConfigEntity,
  UpdateProjectStorageConfigDto,
  UpdateStorageProviderConfigDto,
} from '../interfaces/storage-provider-config.interface';
import { IStorageProviderConfigService } from '../interfaces/storage-provider-config-service.interface';
import { INJECTION_TOKENS } from '../constants/injection-tokens';

/**
 * Service for managing storage provider configurations
 */
@Injectable()
export class StorageProviderConfigService
  implements IStorageProviderConfigService
{
  constructor(
    @Inject(INJECTION_TOKENS.REPOSITORY.STORAGE_PROVIDER_CONFIG)
    private readonly repository: IStorageProviderConfigRepository,
  ) {}

  /**
   * Create a new storage provider configuration
   */
  async createProviderConfig(
    data: CreateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity> {
    return this.repository.createProviderConfig(data);
  }

  /**
   * Get a provider configuration by ID
   */
  async getProviderConfigById(
    id: number,
  ): Promise<StorageProviderConfigEntity> {
    const config = await this.repository.findProviderConfigById(id);

    if (!config) {
      throw new NotFoundException(
        `Storage provider configuration with ID ${id} not found`,
      );
    }

    return config;
  }

  /**
   * Get all provider configurations for an organization
   */
  async getProviderConfigsByOrganization(): Promise<
    StorageProviderConfigEntity[]
  > {
    return this.repository.findProviderConfigsByOrganizationId(undefined);
  }

  /**
   * Get the default provider configuration for an organization
   */
  async getDefaultProviderConfig(): Promise<StorageProviderConfigEntity | null> {
    return this.repository.findDefaultProviderConfigForOrganization(undefined);
  }

  /**
   * Update a provider configuration
   */
  async updateProviderConfig(
    id: number,
    data: UpdateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity> {
    await this.getProviderConfigById(id);
    return this.repository.updateProviderConfig(id, data);
  }

  /**
   * Delete a provider configuration
   */
  async deleteProviderConfig(id: number): Promise<void> {
    await this.getProviderConfigById(id);
    return this.repository.deleteProviderConfig(id);
  }

  /**
   * Associate a storage provider configuration with a project
   */
  async createProjectConfig(
    data: CreateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity> {
    return this.repository.createProjectConfig(data);
  }

  /**
   * Get all storage configurations for a project
   */
  async getProjectConfigs(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity[]> {
    return this.repository.findProjectConfigsByProjectId(projectId);
  }

  /**
   * Get the default storage configuration for a project
   */
  async getDefaultProjectConfig(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity | null> {
    return this.repository.findDefaultProviderConfigForProject(projectId);
  }

  /**
   * Update a project's storage configuration
   */
  async updateProjectConfig(
    projectId: number,
    providerConfigId: number,
    data: UpdateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity> {
    const config = await this.repository.findProjectConfig(
      projectId,
      providerConfigId,
    );

    if (!config) {
      throw new NotFoundException(
        `Storage configuration for project ${projectId} and provider ${providerConfigId} not found`,
      );
    }

    return this.repository.updateProjectConfig(
      projectId,
      providerConfigId,
      data,
    );
  }

  /**
   * Remove a storage configuration from a project
   */
  async deleteProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<void> {
    const config = await this.repository.findProjectConfig(
      projectId,
      providerConfigId,
    );

    if (!config) {
      throw new NotFoundException(
        `Storage configuration for project ${projectId} and provider ${providerConfigId} not found`,
      );
    }

    return this.repository.deleteProjectConfig(projectId, providerConfigId);
  }
}
