import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for file download requests
 */
export class DownloadFileDto {
  @ApiProperty({
    description: 'Path to the file to download',
    example: 'images/profile.jpg',
  })
  @IsString()
  path!: string;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for file deletion requests
 */
export class DeleteFileDto {
  @ApiProperty({
    description: 'Path to the file to delete',
    example: 'images/profile.jpg',
  })
  @IsString()
  path!: string;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for file listing requests
 */
export class ListFilesDto {
  @ApiPropertyOptional({
    description: 'Path prefix to filter results',
    example: 'images/',
  })
  @IsString()
  @IsOptional()
  prefix?: string;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for file item in listing results
 */
export class StorageItemDto {
  @ApiProperty({
    description: 'Path to the item',
    example: 'images/profile.jpg',
  })
  path!: string;

  @ApiProperty({
    description: 'Whether the item is a directory',
    example: false,
  })
  isDirectory!: boolean;

  @ApiProperty({
    description: 'Size of the file in bytes (0 for directories)',
    example: 1024,
  })
  size!: number;

  @ApiProperty({
    description: 'Timestamp when the item was last modified',
    example: '2023-01-01T12:00:00Z',
  })
  lastModified!: Date;

  @ApiPropertyOptional({
    description: 'MIME type of the file (undefined for directories)',
    example: 'image/jpeg',
  })
  contentType?: string;
}

/**
 * DTO for file metadata requests
 */
export class GetMetadataDto {
  @ApiProperty({
    description: 'Path to the file',
    example: 'images/profile.jpg',
  })
  @IsString()
  path!: string;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for updating file metadata
 */
export class UpdateMetadataDto {
  @ApiProperty({
    description: 'Path to the file',
    example: 'images/profile.jpg',
  })
  @IsString()
  path!: string;

  @ApiProperty({
    description: 'Custom metadata to update',
    example: { owner: 'user123', category: 'profile' },
    type: 'object',
    additionalProperties: true,
  })
  metadata!: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for file metadata response
 */
export class MetadataResponseDto {
  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  contentType!: string;

  @ApiProperty({
    description: 'Size of the file in bytes',
    example: 1024,
  })
  size!: number;

  @ApiProperty({
    description: 'Timestamp when the file was created',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the file was last modified',
    example: '2023-01-01T12:00:00Z',
  })
  lastModified!: Date;

  @ApiPropertyOptional({
    description: 'ETag or other hash of the file content',
    example: '"d41d8cd98f00b204e9800998ecf8427e"',
  })
  etag?: string;

  @ApiProperty({
    description: 'Custom metadata as key-value pairs',
    example: { owner: 'user123', category: 'profile' },
    type: 'object',
    additionalProperties: true,
  })
  custom!: Record<string, string>;
}

/**
 * DTO for organization storage usage response
 */
export class StorageUsageDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  organizationId!: string;

  @ApiProperty({
    description: 'Current storage usage in bytes',
    example: 1048576,
  })
  usage!: number;

  @ApiProperty({
    description: 'Storage quota in bytes (0 for unlimited)',
    example: 1073741824,
  })
  quota!: number;

  @ApiProperty({
    description: 'Usage as percentage of quota',
    example: 10.5,
  })
  usagePercentage!: number;
}
