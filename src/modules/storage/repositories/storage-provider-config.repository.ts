import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantContext } from '@/shared/context/tenant.context';
import {
  CreateProjectStorageConfigDto,
  CreateStorageProviderConfigDto,
  IStorageProviderConfigRepository,
  ProjectStorageConfigEntity,
  StorageProviderConfigEntity,
  UpdateProjectStorageConfigDto,
  UpdateStorageProviderConfigDto,
} from '../interfaces/storage-provider-config.interface';
import {
  StorageProviderConfig,
  StorageProviderType,
} from '../interfaces/storage-config.interface';
import {
  Prisma,
  StorageProviderConfig as PrismaStorageProviderConfig,
  ProjectStorageConfig as PrismaProjectStorageConfig,
} from '@prisma/client';

/**
 * Repository for storage provider configurations
 */
@Injectable()
export class StorageProviderConfigRepository
  implements IStorageProviderConfigRepository
{
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new storage provider configuration
   */
  async createProviderConfig(
    data: CreateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity> {
    const organizationId = this.getOrganizationId(data.organizationId);

    // If this is set as default, unset any existing default providers
    if (data.isDefault) {
      await this.prisma.storageProviderConfig.updateMany({
        where: { organizationId },
        data: { isDefault: false },
      });
    }

    const result = await this.prisma.storageProviderConfig.create({
      data: {
        name: data.name,
        type: data.type,
        organizationId,
        isDefault: data.isDefault ?? false,
        config: data.config as unknown as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(result);
  }

  /**
   * Find a storage provider configuration by ID
   */
  async findProviderConfigById(
    id: number,
  ): Promise<StorageProviderConfigEntity | null> {
    const organizationId = TenantContext.getCurrentTenantId();

    const result = await this.prisma.storageProviderConfig.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Find storage provider configurations by organization ID
   */
  async findProviderConfigsByOrganizationId(
    organizationId?: number,
  ): Promise<StorageProviderConfigEntity[]> {
    const orgId = this.getOrganizationId(organizationId);

    const results = await this.prisma.storageProviderConfig.findMany({
      where: {
        organizationId: orgId,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return results.map((result) => this.mapToEntity(result));
  }

  /**
   * Find default storage provider configuration for an organization
   */
  async findDefaultProviderConfigForOrganization(
    organizationId?: number,
  ): Promise<StorageProviderConfigEntity | null> {
    const orgId = this.getOrganizationId(organizationId);

    const result = await this.prisma.storageProviderConfig.findFirst({
      where: {
        organizationId: orgId,
        isDefault: true,
      },
    });

    return result ? this.mapToEntity(result) : null;
  }

  /**
   * Update a storage provider configuration
   */
  async updateProviderConfig(
    id: number,
    data: UpdateStorageProviderConfigDto,
  ): Promise<StorageProviderConfigEntity> {
    const organizationId = TenantContext.getCurrentTenantId();

    // If this is set as default, unset any existing default providers
    if (data.isDefault) {
      await this.prisma.storageProviderConfig.updateMany({
        where: {
          organizationId,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const result = await this.prisma.storageProviderConfig.update({
      where: { id },
      data: {
        name: data.name,
        isDefault: data.isDefault,
        config: data.config
          ? (data.config as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    return this.mapToEntity(result);
  }

  /**
   * Delete a storage provider configuration
   */
  async deleteProviderConfig(id: number): Promise<void> {
    const organizationId = TenantContext.getCurrentTenantId();

    // Check if there are any projects using this provider
    const projectConfigCount = await this.prisma.projectStorageConfig.count({
      where: {
        providerConfigId: id,
        providerConfig: {
          organizationId,
        },
      },
    });

    if (projectConfigCount > 0) {
      throw new Error(
        `Cannot delete provider configuration that is in use by ${projectConfigCount} projects`,
      );
    }

    await this.prisma.storageProviderConfig.deleteMany({
      where: {
        id,
        organizationId,
      },
    });
  }

  /**
   * Create a new project storage configuration
   */
  async createProjectConfig(
    data: CreateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity> {
    const organizationId = TenantContext.getCurrentTenantId();

    // Ensure the project belongs to the current organization
    const project = await this.prisma.project.findFirst({
      where: {
        id: data.projectId,
        organizationId,
      },
    });

    if (!project) {
      throw new Error(
        `Project with ID ${data.projectId} not found in organization ${organizationId}`,
      );
    }

    // Ensure the provider config belongs to the current organization
    const providerConfig = await this.prisma.storageProviderConfig.findFirst({
      where: {
        id: data.providerConfigId,
        organizationId,
      },
    });

    if (!providerConfig) {
      throw new Error(
        `Storage provider configuration with ID ${data.providerConfigId} not found in organization ${organizationId}`,
      );
    }

    // If this is set as default, unset any existing default providers for this project
    if (data.isDefault) {
      await this.prisma.projectStorageConfig.updateMany({
        where: {
          projectId: data.projectId,
          project: {
            organizationId,
          },
        },
        data: { isDefault: false },
      });
    }

    const result = await this.prisma.projectStorageConfig.create({
      data: {
        projectId: data.projectId,
        providerConfigId: data.providerConfigId,
        isDefault: data.isDefault ?? true,
        pathPrefix: data.pathPrefix,
        quotaLimit: data.quotaLimit,
      },
      include: {
        providerConfig: true,
      },
    });

    return this.mapToProjectEntity(result);
  }

  /**
   * Find project storage configurations by project ID
   */
  async findProjectConfigsByProjectId(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity[]> {
    const organizationId = TenantContext.getCurrentTenantId();

    const results = await this.prisma.projectStorageConfig.findMany({
      where: {
        projectId,
        project: {
          organizationId,
        },
      },
      include: {
        providerConfig: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return results.map((result) => this.mapToProjectEntity(result));
  }

  /**
   * Find default storage provider configuration for a project
   */
  async findDefaultProviderConfigForProject(
    projectId: number,
  ): Promise<ProjectStorageConfigEntity | null> {
    const organizationId = TenantContext.getCurrentTenantId();

    const result = await this.prisma.projectStorageConfig.findFirst({
      where: {
        projectId,
        isDefault: true,
        project: {
          organizationId,
        },
      },
      include: {
        providerConfig: true,
      },
    });

    return result ? this.mapToProjectEntity(result) : null;
  }

  /**
   * Find a specific project-provider mapping
   */
  async findProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<ProjectStorageConfigEntity | null> {
    const organizationId = TenantContext.getCurrentTenantId();

    const result = await this.prisma.projectStorageConfig.findFirst({
      where: {
        projectId,
        providerConfigId,
        project: {
          organizationId,
        },
        providerConfig: {
          organizationId,
        },
      },
      include: {
        providerConfig: true,
      },
    });

    return result ? this.mapToProjectEntity(result) : null;
  }

  /**
   * Update a project storage configuration
   */
  async updateProjectConfig(
    projectId: number,
    providerConfigId: number,
    data: UpdateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigEntity> {
    const organizationId = TenantContext.getCurrentTenantId();

    // If this is set as default, unset any existing default providers for this project
    if (data.isDefault) {
      await this.prisma.projectStorageConfig.updateMany({
        where: {
          projectId,
          providerConfigId: { not: providerConfigId },
          project: {
            organizationId,
          },
        },
        data: { isDefault: false },
      });
    }

    const result = await this.prisma.projectStorageConfig.update({
      where: {
        projectId_providerConfigId: {
          projectId,
          providerConfigId,
        },
      },
      data: {
        isDefault: data.isDefault,
        pathPrefix: data.pathPrefix,
        quotaLimit: data.quotaLimit,
      },
      include: {
        providerConfig: true,
      },
    });

    return this.mapToProjectEntity(result);
  }

  /**
   * Delete a project storage configuration
   */
  async deleteProjectConfig(
    projectId: number,
    providerConfigId: number,
  ): Promise<void> {
    const organizationId = TenantContext.getCurrentTenantId();

    // Ensure we only delete configurations from the current organization
    await this.prisma.projectStorageConfig.deleteMany({
      where: {
        projectId,
        providerConfigId,
        project: {
          organizationId,
        },
        providerConfig: {
          organizationId,
        },
      },
    });
  }

  /**
   * Get the organization ID from the provided ID or from the tenant context
   */
  private getOrganizationId(providedId?: number): number {
    const contextId = TenantContext.getCurrentTenantId();

    if (!contextId) {
      throw new Error('No organization context found');
    }

    if (providedId && providedId !== contextId) {
      throw new Error(
        `Organization ID mismatch: provided ${providedId}, but context has ${contextId}`,
      );
    }

    return contextId;
  }

  /**
   * Maps a Prisma storage provider config to an entity
   */
  private mapToEntity(
    data: PrismaStorageProviderConfig,
  ): StorageProviderConfigEntity {
    return {
      id: data.id,
      name: data.name,
      type: data.type as StorageProviderType,
      organizationId: data.organizationId,
      isDefault: data.isDefault,
      config: data.config as unknown as StorageProviderConfig,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  /**
   * Maps a Prisma project storage config to an entity
   */
  private mapToProjectEntity(
    data: PrismaProjectStorageConfig & {
      providerConfig?: PrismaStorageProviderConfig;
    },
  ): ProjectStorageConfigEntity {
    return {
      id: data.id,
      projectId: data.projectId,
      providerConfigId: data.providerConfigId,
      isDefault: data.isDefault,
      pathPrefix: data.pathPrefix || undefined,
      quotaLimit: data.quotaLimit,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      providerConfig: data.providerConfig
        ? this.mapToEntity(data.providerConfig)
        : undefined,
    };
  }
}
