import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CanCreate,
  CanDelete,
  CanRead,
  CanUpdate,
} from '../../../shared/decorators/require-permissions.decorator';
import {
  CreateProjectStorageConfigDto,
  CreateProviderConfigDto,
  ProjectStorageConfigResponseDto,
  ProviderConfigResponseDto,
  UpdateProjectStorageConfigDto,
  UpdateProviderConfigDto,
} from '../dto/storage-provider-config.dto';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import { IStorageProviderConfigService } from '../interfaces/storage-provider-config-service.interface';
import {
  ProjectStorageConfigEntity,
  StorageProviderConfigEntity,
} from '../interfaces/storage-provider-config.interface';

/**
 * Controller for storage provider configuration endpoints
 */
@ApiTags('Storage Provider Configuration')
@Controller('storage/providers')
export class StorageProviderConfigController {
  constructor(
    @Inject(INJECTION_TOKENS.SERVICE.STORAGE_PROVIDER_CONFIG)
    private readonly providerConfigService: IStorageProviderConfigService,
  ) {}

  /**
   * Get all storage provider configurations for the current organization
   */
  @Get()
  @CanRead('storage')
  @ApiOperation({
    summary: 'Get all storage provider configurations',
    description:
      'Retrieves all storage provider configurations for the current organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of provider configurations',
    type: [ProviderConfigResponseDto],
  })
  async getAllProviderConfigs(): Promise<ProviderConfigResponseDto[]> {
    const configs =
      await this.providerConfigService.getProviderConfigsByOrganization();
    return configs.map((config) => this.mapToProviderResponse(config));
  }

  /**
   * Get the default storage provider configuration
   */
  @Get('default')
  @CanRead('storage')
  @ApiOperation({
    summary: 'Get default storage provider configuration',
    description:
      'Retrieves the default storage provider configuration for the current organization',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default provider configuration',
    type: ProviderConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Default provider configuration not found',
  })
  async getDefaultProviderConfig(): Promise<ProviderConfigResponseDto | null> {
    const config = await this.providerConfigService.getDefaultProviderConfig();
    return config ? this.mapToProviderResponse(config) : null;
  }

  /**
   * Get a specific storage provider configuration
   */
  @Get(':id')
  @CanRead('storage')
  @ApiOperation({
    summary: 'Get storage provider configuration',
    description: 'Retrieves a specific storage provider configuration by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider configuration ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider configuration',
    type: ProviderConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider configuration not found',
  })
  async getProviderConfig(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProviderConfigResponseDto> {
    const config = await this.providerConfigService.getProviderConfigById(id);

    if (!config) {
      throw new NotFoundException(
        `Provider configuration with ID ${id} not found`,
      );
    }

    return this.mapToProviderResponse(config);
  }

  /**
   * Create a new storage provider configuration
   */
  @Post()
  @CanCreate('storage')
  @ApiOperation({
    summary: 'Create storage provider configuration',
    description:
      'Creates a new storage provider configuration for the current organization',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Provider configuration created',
    type: ProviderConfigResponseDto,
  })
  async createProviderConfig(
    @Body() dto: CreateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    const config = await this.providerConfigService.createProviderConfig(dto);
    return this.mapToProviderResponse(config);
  }

  /**
   * Update a storage provider configuration
   */
  @Put(':id')
  @CanUpdate('storage')
  @ApiOperation({
    summary: 'Update storage provider configuration',
    description: 'Updates an existing storage provider configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider configuration ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Provider configuration updated',
    type: ProviderConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider configuration not found',
  })
  async updateProviderConfig(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    const config = await this.providerConfigService.updateProviderConfig(
      id,
      dto,
    );
    return this.mapToProviderResponse(config);
  }

  /**
   * Delete a storage provider configuration
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CanDelete('storage')
  @ApiOperation({
    summary: 'Delete storage provider configuration',
    description: 'Deletes a storage provider configuration',
  })
  @ApiParam({
    name: 'id',
    description: 'Provider configuration ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Provider configuration deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Provider configuration not found',
  })
  async deleteProviderConfig(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    await this.providerConfigService.deleteProviderConfig(id);
  }

  /**
   * Get all storage configurations for a project
   */
  @Get('projects/:projectId')
  @CanRead('storage')
  @ApiOperation({
    summary: 'Get project storage configurations',
    description: 'Retrieves all storage configurations for a specific project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of project storage configurations',
    type: [ProjectStorageConfigResponseDto],
  })
  async getProjectConfigs(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectStorageConfigResponseDto[]> {
    const configs =
      await this.providerConfigService.getProjectConfigs(projectId);

    return configs.map((config) => this.mapToProjectResponse(config));
  }

  /**
   * Get the default storage configuration for a project
   */
  @Get('projects/:projectId/default')
  @CanRead('storage')
  @ApiOperation({
    summary: 'Get default project storage configuration',
    description:
      'Retrieves the default storage configuration for a specific project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Default project storage configuration',
    type: ProjectStorageConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Default project storage configuration not found',
  })
  async getDefaultProjectConfig(
    @Param('projectId', ParseIntPipe) projectId: number,
  ): Promise<ProjectStorageConfigResponseDto | null> {
    const config =
      await this.providerConfigService.getDefaultProjectConfig(projectId);

    if (!config) {
      return null;
    }

    return this.mapToProjectResponse(config);
  }

  /**
   * Associate a storage provider with a project
   */
  @Post('projects')
  @CanCreate('storage')
  @ApiOperation({
    summary: 'Create project storage configuration',
    description: 'Associates a storage provider with a project',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Project storage configuration created',
    type: ProjectStorageConfigResponseDto,
  })
  async createProjectConfig(
    @Body() dto: CreateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigResponseDto> {
    // Convert quotaLimit to BigInt if it's a number
    const convertedDto = {
      ...dto,
      quotaLimit: dto.quotaLimit ? BigInt(dto.quotaLimit.toString()) : null,
    };

    const config =
      await this.providerConfigService.createProjectConfig(convertedDto);

    return this.mapToProjectResponse(config);
  }

  /**
   * Update a project's storage configuration
   */
  @Put('projects/:projectId/providers/:providerConfigId')
  @CanUpdate('storage')
  @ApiOperation({
    summary: 'Update project storage configuration',
    description: 'Updates the storage configuration for a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: Number,
  })
  @ApiParam({
    name: 'providerConfigId',
    description: 'Provider configuration ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project storage configuration updated',
    type: ProjectStorageConfigResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project storage configuration not found',
  })
  async updateProjectConfig(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('providerConfigId', ParseIntPipe) providerConfigId: number,
    @Body() dto: UpdateProjectStorageConfigDto,
  ): Promise<ProjectStorageConfigResponseDto> {
    // Convert quotaLimit to BigInt if it's a number
    const convertedDto = {
      ...dto,
      quotaLimit: dto.quotaLimit ? BigInt(dto.quotaLimit.toString()) : null,
    };

    const config = await this.providerConfigService.updateProjectConfig(
      projectId,
      providerConfigId,
      convertedDto,
    );

    return this.mapToProjectResponse(config);
  }

  /**
   * Remove a storage configuration from a project
   */
  @Delete('projects/:projectId/providers/:providerConfigId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CanDelete('storage')
  @ApiOperation({
    summary: 'Delete project storage configuration',
    description: 'Removes a storage configuration from a project',
  })
  @ApiParam({
    name: 'projectId',
    description: 'Project ID',
    type: Number,
  })
  @ApiParam({
    name: 'providerConfigId',
    description: 'Provider configuration ID',
    type: Number,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Project storage configuration deleted',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Project storage configuration not found',
  })
  async deleteProjectConfig(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Param('providerConfigId', ParseIntPipe) providerConfigId: number,
  ): Promise<void> {
    await this.providerConfigService.deleteProjectConfig(
      projectId,
      providerConfigId,
    );
  }

  /**
   * Map StorageProviderConfigEntity to ProviderConfigResponseDto with masked sensitive data
   */
  private mapToProviderResponse(
    config: StorageProviderConfigEntity,
  ): ProviderConfigResponseDto {
    // Create a copy of the configuration with masked sensitive data
    const maskedConfig = { ...config.config };

    // Mask sensitive fields based on provider type
    if ('token' in maskedConfig) {
      maskedConfig.token = '********';
    }

    if ('secretAccessKey' in maskedConfig) {
      maskedConfig.secretAccessKey = '********';
    }

    if ('accessKeyId' in maskedConfig) {
      // Show first and last few characters
      const keyId = maskedConfig.accessKeyId as string;
      maskedConfig.accessKeyId = `${keyId.substring(0, 4)}...${keyId.substring(
        keyId.length - 4,
      )}`;
    }

    return {
      id: config.id,
      name: config.name,
      type: config.type,
      organizationId: config.organizationId,
      isDefault: config.isDefault,
      config: maskedConfig,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Map ProjectStorageConfigEntity to ProjectStorageConfigResponseDto
   */
  private mapToProjectResponse(
    config: ProjectStorageConfigEntity,
  ): ProjectStorageConfigResponseDto {
    const response: ProjectStorageConfigResponseDto = {
      id: config.id,
      projectId: config.projectId,
      providerConfigId: config.providerConfigId,
      isDefault: config.isDefault,
      pathPrefix: config.pathPrefix,
      quotaLimit: config.quotaLimit,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      providerConfig: config.providerConfig
        ? this.mapToProviderResponse(config.providerConfig)
        : undefined,
    };
    return response;
  }
}
