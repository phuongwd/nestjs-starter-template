import { Test, TestingModule } from '@nestjs/testing';
import { StorageProviderConfigRepository } from './storage-provider-config.repository';
import { PrismaService } from '@/prisma/prisma.service';
import { TenantContext } from '@/shared/context/tenant.context';
import { StorageProviderType } from '../interfaces/storage-config.interface';
import { CreateStorageProviderConfigDto } from '../interfaces/storage-provider-config.interface';

describe('StorageProviderConfigRepository', () => {
  let repository: StorageProviderConfigRepository;
  let prismaService: PrismaService;

  const mockOrganizationId = 1;
  const mockProjectId = 101;
  const mockProviderId = 201;

  const mockProviderConfig = {
    id: mockProviderId,
    name: 'Test GitHub Provider',
    type: StorageProviderType.GITHUB,
    organizationId: mockOrganizationId,
    isDefault: true,
    config: {
      type: StorageProviderType.GITHUB as const,
      branch: 'main',
      owner: 'test-org',
      repo: 'test-repo',
      token: 'test-token',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProjectConfig = {
    id: 301,
    projectId: mockProjectId,
    providerConfigId: mockProviderId,
    isDefault: true,
    pathPrefix: 'test-project',
    quotaLimit: BigInt(1073741824), // 1GB
    createdAt: new Date(),
    updatedAt: new Date(),
    providerConfig: mockProviderConfig,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageProviderConfigRepository,
        {
          provide: PrismaService,
          useValue: {
            storageProviderConfig: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
              count: jest.fn(),
            },
            projectStorageConfig: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              deleteMany: jest.fn(),
            },
            project: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: TenantContext,
          useValue: {
            organizationId: mockOrganizationId,
          },
        },
      ],
    }).compile();

    repository = module.get<StorageProviderConfigRepository>(
      StorageProviderConfigRepository,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createProviderConfig', () => {
    it('should create a provider configuration', async () => {
      const createData: CreateStorageProviderConfigDto = {
        name: 'Test GitHub Provider',
        type: StorageProviderType.GITHUB,
        organizationId: mockOrganizationId,
        isDefault: true,
        config: {
          type: StorageProviderType.GITHUB as const,
          branch: 'main',
          owner: 'test-org',
          repo: 'test-repo',
          token: 'test-token',
        },
      };

      (
        prismaService.storageProviderConfig.create as jest.Mock
      ).mockResolvedValue(mockProviderConfig);

      const result = await repository.createProviderConfig(createData);

      expect(result).toEqual(mockProviderConfig);
      expect(prismaService.storageProviderConfig.create).toHaveBeenCalledWith({
        data: {
          name: createData.name,
          type: createData.type,
          organizationId: mockOrganizationId,
          isDefault: createData.isDefault,
          config: createData.config,
        },
      });
    });

    it('should unset existing default providers when creating a new default', async () => {
      const createData: CreateStorageProviderConfigDto = {
        name: 'Test GitHub Provider',
        type: StorageProviderType.GITHUB,
        organizationId: mockOrganizationId,
        isDefault: true,
        config: {
          type: StorageProviderType.GITHUB as const,
          branch: 'main',
          owner: 'test-org',
          repo: 'test-repo',
          token: 'test-token',
        },
      };

      (
        prismaService.storageProviderConfig.create as jest.Mock
      ).mockResolvedValue(mockProviderConfig);

      await repository.createProviderConfig(createData);

      expect(
        prismaService.storageProviderConfig.updateMany,
      ).toHaveBeenCalledWith({
        where: { organizationId: mockOrganizationId },
        data: { isDefault: false },
      });
    });
  });

  describe('findProviderConfigById', () => {
    it('should find a provider configuration by ID', async () => {
      (
        prismaService.storageProviderConfig.findFirst as jest.Mock
      ).mockResolvedValue(mockProviderConfig);

      const result = await repository.findProviderConfigById(mockProviderId);

      expect(result).toEqual(mockProviderConfig);
      expect(
        prismaService.storageProviderConfig.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: mockProviderId,
          organizationId: mockOrganizationId,
        },
      });
    });
  });

  describe('findDefaultProviderConfigForOrganization', () => {
    it('should find the default provider configuration for an organization', async () => {
      (
        prismaService.storageProviderConfig.findFirst as jest.Mock
      ).mockResolvedValue(mockProviderConfig);

      const result =
        await repository.findDefaultProviderConfigForOrganization();

      expect(result).toEqual(mockProviderConfig);
      expect(
        prismaService.storageProviderConfig.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          organizationId: mockOrganizationId,
          isDefault: true,
        },
      });
    });
  });

  describe('createProjectConfig', () => {
    beforeEach(() => {
      (prismaService.project.findFirst as jest.Mock).mockResolvedValue({
        id: mockProjectId,
        organizationId: mockOrganizationId,
      });
      (
        prismaService.storageProviderConfig.findFirst as jest.Mock
      ).mockResolvedValue(mockProviderConfig);
    });

    it('should create a project storage configuration', async () => {
      (
        prismaService.projectStorageConfig.create as jest.Mock
      ).mockResolvedValue(mockProjectConfig);

      const result = await repository.createProjectConfig({
        projectId: mockProjectId,
        providerConfigId: mockProviderId,
        isDefault: true,
        pathPrefix: 'test-project',
      });

      expect(result).toEqual(mockProjectConfig);
      expect(prismaService.projectStorageConfig.create).toHaveBeenCalledWith({
        data: {
          projectId: mockProjectId,
          providerConfigId: mockProviderId,
          isDefault: true,
          pathPrefix: 'test-project',
          quotaLimit: undefined,
        },
        include: {
          providerConfig: true,
        },
      });
    });

    it('should throw an error if project not found in organization', async () => {
      (prismaService.project.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        repository.createProjectConfig({
          projectId: mockProjectId,
          providerConfigId: mockProviderId,
        }),
      ).rejects.toThrow(
        `Project with ID ${mockProjectId} not found in organization ${mockOrganizationId}`,
      );
    });

    it('should throw an error if provider config not found in organization', async () => {
      (
        prismaService.storageProviderConfig.findFirst as jest.Mock
      ).mockResolvedValue(null);

      await expect(
        repository.createProjectConfig({
          projectId: mockProjectId,
          providerConfigId: mockProviderId,
        }),
      ).rejects.toThrow(
        `Storage provider configuration with ID ${mockProviderId} not found in organization ${mockOrganizationId}`,
      );
    });
  });

  describe('findProjectConfigsByProjectId', () => {
    it('should find all storage configurations for a project', async () => {
      (
        prismaService.projectStorageConfig.findMany as jest.Mock
      ).mockResolvedValue([mockProjectConfig]);

      const result =
        await repository.findProjectConfigsByProjectId(mockProjectId);

      expect(result).toEqual([mockProjectConfig]);
      expect(prismaService.projectStorageConfig.findMany).toHaveBeenCalledWith({
        where: {
          projectId: mockProjectId,
          project: {
            organizationId: mockOrganizationId,
          },
        },
        include: {
          providerConfig: true,
        },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    });
  });

  describe('deleteProviderConfig', () => {
    it('should delete a provider configuration if not in use', async () => {
      (prismaService.projectStorageConfig.count as jest.Mock).mockResolvedValue(
        0,
      );

      await repository.deleteProviderConfig(mockProviderId);

      expect(
        prismaService.storageProviderConfig.deleteMany,
      ).toHaveBeenCalledWith({
        where: {
          id: mockProviderId,
          organizationId: mockOrganizationId,
        },
      });
    });

    it('should throw an error if provider is in use by projects', async () => {
      (prismaService.projectStorageConfig.count as jest.Mock).mockResolvedValue(
        2,
      );

      await expect(
        repository.deleteProviderConfig(mockProviderId),
      ).rejects.toThrow(
        `Cannot delete provider configuration that is in use by 2 projects`,
      );
    });
  });
});
