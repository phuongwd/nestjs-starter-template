import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  StorageProviderConfig,
  StorageProviderType,
} from '../interfaces/storage-config.interface';

/**
 * Base storage provider config DTO
 */
export class BaseProviderConfigDto {
  @ApiProperty({
    description: 'Storage provider type',
    enum: StorageProviderType,
    example: StorageProviderType.GITHUB,
  })
  @IsEnum(StorageProviderType)
  @IsNotEmpty()
  type!: StorageProviderType;

  @ApiProperty({
    description: 'Provider-specific configuration',
    example: {
      owner: 'organization',
      repo: 'storage-repo',
      token: 'github_token',
      branch: 'main',
    },
  })
  @IsObject()
  @IsNotEmpty()
  config!: StorageProviderConfig;
}

/**
 * Create storage provider config DTO
 */
export class CreateProviderConfigDto extends BaseProviderConfigDto {
  @ApiProperty({
    description: 'Descriptive name for this provider configuration',
    example: 'GitHub Documentation Storage',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default provider for the organization',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

/**
 * Update storage provider config DTO
 */
export class UpdateProviderConfigDto {
  @ApiPropertyOptional({
    description: 'Descriptive name for this provider configuration',
    example: 'GitHub Documentation Storage',
    maxLength: 100,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default provider for the organization',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Provider-specific configuration',
    example: {
      owner: 'organization',
      repo: 'storage-repo',
      token: 'github_token',
      branch: 'main',
    },
  })
  @IsObject()
  @IsOptional()
  config?: StorageProviderConfig;
}

/**
 * Provider configuration response DTO
 */
export class ProviderConfigResponseDto {
  @ApiProperty({
    description: 'Provider configuration ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Descriptive name for this provider configuration',
    example: 'GitHub Documentation Storage',
  })
  name!: string;

  @ApiProperty({
    description: 'Storage provider type',
    enum: StorageProviderType,
    example: StorageProviderType.GITHUB,
  })
  type!: StorageProviderType;

  @ApiProperty({
    description: 'Organization ID',
    example: 1,
  })
  organizationId!: number;

  @ApiProperty({
    description: 'Whether this is the default provider for the organization',
    example: true,
  })
  isDefault!: boolean;

  @ApiProperty({
    description: 'Provider-specific configuration (partially masked)',
    example: {
      owner: 'organization',
      repo: 'storage-repo',
      branch: 'main',
      // sensitive data like tokens will be masked
    },
  })
  config!: StorageProviderConfig;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt!: Date;
}

/**
 * Create project storage config DTO
 */
export class CreateProjectStorageConfigDto {
  @ApiProperty({
    description: 'Project ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  projectId!: number;

  @ApiProperty({
    description: 'Provider configuration ID',
    example: 1,
  })
  @IsInt()
  @IsPositive()
  providerConfigId!: number;

  @ApiPropertyOptional({
    description: 'Whether this is the default provider for the project',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Optional path prefix for this project within the provider',
    example: 'projects/my-project',
  })
  @IsString()
  @IsOptional()
  pathPrefix?: string;

  @ApiPropertyOptional({
    description:
      'Project-specific storage quota limit in bytes (null = unlimited)',
    example: 1073741824, // 1GB
  })
  @IsOptional()
  quotaLimit?: bigint | null;
}

/**
 * Update project storage config DTO
 */
export class UpdateProjectStorageConfigDto {
  @ApiPropertyOptional({
    description: 'Whether this is the default provider for the project',
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Optional path prefix for this project within the provider',
    example: 'projects/my-project',
  })
  @IsString()
  @IsOptional()
  pathPrefix?: string;

  @ApiPropertyOptional({
    description:
      'Project-specific storage quota limit in bytes (null = unlimited)',
    example: 1073741824, // 1GB
  })
  @IsOptional()
  quotaLimit?: bigint | null;
}

/**
 * Project storage config response DTO
 */
export class ProjectStorageConfigResponseDto {
  @ApiProperty({
    description: 'Project storage configuration ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Project ID',
    example: 1,
  })
  projectId!: number;

  @ApiProperty({
    description: 'Provider configuration ID',
    example: 1,
  })
  providerConfigId!: number;

  @ApiProperty({
    description: 'Whether this is the default provider for the project',
    example: true,
  })
  isDefault!: boolean;

  @ApiPropertyOptional({
    description: 'Optional path prefix for this project within the provider',
    example: 'projects/my-project',
  })
  pathPrefix?: string;

  @ApiPropertyOptional({
    description:
      'Project-specific storage quota limit in bytes (null = unlimited)',
    example: 1073741824, // 1GB
  })
  quotaLimit?: bigint | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2023-01-01T00:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Provider configuration details',
    type: ProviderConfigResponseDto,
  })
  @ValidateNested()
  @Type(() => ProviderConfigResponseDto)
  providerConfig?: ProviderConfigResponseDto;
}
