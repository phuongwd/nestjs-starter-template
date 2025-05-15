import { Test, TestingModule } from '@nestjs/testing';
import { StorageProviderConfigService } from './storage-provider-config.service';
import { StorageProviderConfigRepository } from '../repositories/storage-provider-config.repository';
import { NotFoundException } from '@nestjs/common';
import { StorageProviderType } from '../interfaces/storage-config.interface';

describe('StorageProviderConfigService', () => {
  let service: StorageProviderConfigService;
  let repository: StorageProviderConfigRepository;

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
        StorageProviderConfigService,
        {
          provide: StorageProviderConfigRepository,
          useValue: {
            createProviderConfig: jest.fn(),
            findProviderConfigById: jest.fn(),
            findProviderConfigsByOrganizationId: jest.fn(),
            findDefaultProviderConfigForOrganization: jest.fn(),
            updateProviderConfig: jest.fn(),
            deleteProviderConfig: jest.fn(),
            createProjectConfig: jest.fn(),
            findProjectConfigsByProjectId: jest.fn(),
            findDefaultProviderConfigForProject: jest.fn(),
            findProjectConfig: jest.fn(),
            updateProjectConfig: jest.fn(),
            deleteProjectConfig: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<StorageProviderConfigService>(
      StorageProviderConfigService,
    );
    repository = module.get<StorageProviderConfigRepository>(
      StorageProviderConfigRepository,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProviderConfig', () => {
    it('should create a provider configuration', async () => {
      const createData = {
        name: 'Test GitHub Provider',
        type: StorageProviderType.GITHUB,
        config: {
          type: StorageProviderType.GITHUB as const,
          branch: 'main',
          owner: 'test-org',
          repo: 'test-repo',
          token: 'test-token',
        },
      };

      (repository.createProviderConfig as jest.Mock).mockResolvedValue(
        mockProviderConfig,
      );

      const result = await service.createProviderConfig(createData);

      expect(result).toEqual(mockProviderConfig);
      expect(repository.createProviderConfig).toHaveBeenCalledWith(createData);
    });
  });

  describe('getProviderConfigById', () => {
    it('should return a provider configuration by ID', async () => {
      (repository.findProviderConfigById as jest.Mock).mockResolvedValue(
        mockProviderConfig,
      );

      const result = await service.getProviderConfigById(mockProviderId);

      expect(result).toEqual(mockProviderConfig);
      expect(repository.findProviderConfigById).toHaveBeenCalledWith(
        mockProviderId,
      );
    });

    it('should throw NotFoundException if provider not found', async () => {
      (repository.findProviderConfigById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getProviderConfigById(mockProviderId),
      ).rejects.toThrow(
        new NotFoundException(
          `Storage provider configuration with ID ${mockProviderId} not found`,
        ),
      );
    });
  });

  describe('getProviderConfigsByOrganization', () => {
    it('should return all provider configurations for an organization', async () => {
      (
        repository.findProviderConfigsByOrganizationId as jest.Mock
      ).mockResolvedValue([mockProviderConfig]);

      const result = await service.getProviderConfigsByOrganization();

      expect(result).toEqual([mockProviderConfig]);
      expect(repository.findProviderConfigsByOrganizationId).toHaveBeenCalled();
    });
  });

  describe('getDefaultProviderConfig', () => {
    it('should return the default provider configuration for an organization', async () => {
      (
        repository.findDefaultProviderConfigForOrganization as jest.Mock
      ).mockResolvedValue(mockProviderConfig);

      const result = await service.getDefaultProviderConfig();

      expect(result).toEqual(mockProviderConfig);
      expect(
        repository.findDefaultProviderConfigForOrganization,
      ).toHaveBeenCalled();
    });
  });

  describe('updateProviderConfig', () => {
    it('should update a provider configuration', async () => {
      const updateData = {
        name: 'Updated GitHub Provider',
        isDefault: false,
      };

      (repository.findProviderConfigById as jest.Mock).mockResolvedValue(
        mockProviderConfig,
      );
      (repository.updateProviderConfig as jest.Mock).mockResolvedValue({
        ...mockProviderConfig,
        name: updateData.name,
        isDefault: updateData.isDefault,
      });

      const result = await service.updateProviderConfig(
        mockProviderId,
        updateData,
      );

      expect(result).toEqual({
        ...mockProviderConfig,
        name: updateData.name,
        isDefault: updateData.isDefault,
      });
      expect(repository.updateProviderConfig).toHaveBeenCalledWith(
        mockProviderId,
        updateData,
      );
    });

    it('should throw NotFoundException if provider not found', async () => {
      (repository.findProviderConfigById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProviderConfig(mockProviderId, { name: 'Updated' }),
      ).rejects.toThrow(
        new NotFoundException(
          `Storage provider configuration with ID ${mockProviderId} not found`,
        ),
      );
    });
  });

  describe('createProjectConfig', () => {
    it('should create a project storage configuration', async () => {
      const createData = {
        projectId: mockProjectId,
        providerConfigId: mockProviderId,
        isDefault: true,
        pathPrefix: 'test-project',
      };

      (repository.createProjectConfig as jest.Mock).mockResolvedValue(
        mockProjectConfig,
      );

      const result = await service.createProjectConfig(createData);

      expect(result).toEqual(mockProjectConfig);
      expect(repository.createProjectConfig).toHaveBeenCalledWith(createData);
    });
  });

  describe('getProjectConfigs', () => {
    it('should return all storage configurations for a project', async () => {
      (repository.findProjectConfigsByProjectId as jest.Mock).mockResolvedValue(
        [mockProjectConfig],
      );

      const result = await service.getProjectConfigs(mockProjectId);

      expect(result).toEqual([mockProjectConfig]);
      expect(repository.findProjectConfigsByProjectId).toHaveBeenCalledWith(
        mockProjectId,
      );
    });
  });

  describe('updateProjectConfig', () => {
    it('should update a project storage configuration', async () => {
      const updateData = {
        isDefault: false,
        quotaLimit: BigInt(2147483648), // 2GB
      };

      (repository.findProjectConfig as jest.Mock).mockResolvedValue(
        mockProjectConfig,
      );
      (repository.updateProjectConfig as jest.Mock).mockResolvedValue({
        ...mockProjectConfig,
        isDefault: updateData.isDefault,
        quotaLimit: updateData.quotaLimit,
      });

      const result = await service.updateProjectConfig(
        mockProjectId,
        mockProviderId,
        updateData,
      );

      expect(result).toEqual({
        ...mockProjectConfig,
        isDefault: updateData.isDefault,
        quotaLimit: updateData.quotaLimit,
      });
      expect(repository.updateProjectConfig).toHaveBeenCalledWith(
        mockProjectId,
        mockProviderId,
        updateData,
      );
    });

    it('should throw NotFoundException if project config not found', async () => {
      (repository.findProjectConfig as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateProjectConfig(mockProjectId, mockProviderId, {
          isDefault: false,
        }),
      ).rejects.toThrow(
        new NotFoundException(
          `Storage configuration for project ${mockProjectId} and provider ${mockProviderId} not found`,
        ),
      );
    });
  });

  describe('deleteProjectConfig', () => {
    it('should delete a project storage configuration', async () => {
      (repository.findProjectConfig as jest.Mock).mockResolvedValue(
        mockProjectConfig,
      );
      (repository.deleteProjectConfig as jest.Mock).mockResolvedValue(
        undefined,
      );

      await service.deleteProjectConfig(mockProjectId, mockProviderId);

      expect(repository.deleteProjectConfig).toHaveBeenCalledWith(
        mockProjectId,
        mockProviderId,
      );
    });

    it('should throw NotFoundException if project config not found', async () => {
      (repository.findProjectConfig as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteProjectConfig(mockProjectId, mockProviderId),
      ).rejects.toThrow(
        new NotFoundException(
          `Storage configuration for project ${mockProjectId} and provider ${mockProviderId} not found`,
        ),
      );
    });
  });
});
