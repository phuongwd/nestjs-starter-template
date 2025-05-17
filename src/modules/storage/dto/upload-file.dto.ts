import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { StorageAcl } from '../interfaces/storage-provider.interface';

/**
 * DTO for file upload requests
 */
export class UploadFileDto {
  @ApiProperty({
    description: 'Path where the file should be stored',
    example: 'images/profile.jpg',
  })
  @IsString()
  path!: string;

  @ApiPropertyOptional({
    description: 'Access control level for the file',
    enum: StorageAcl,
    example: StorageAcl.PUBLIC_READ,
  })
  @IsEnum(StorageAcl)
  @IsOptional()
  acl?: StorageAcl;

  @ApiPropertyOptional({
    description: 'Custom metadata to store with the file',
    example: { owner: 'user123', category: 'profile' },
    type: 'object',
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}

/**
 * DTO for successful file upload response
 */
export class UploadFileResponseDto {
  @ApiProperty({
    description: 'Path where the file was stored',
    example: 'images/profile.jpg',
  })
  path!: string;

  @ApiProperty({
    description: 'Size of the file in bytes',
    example: 1024,
  })
  size!: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'image/jpeg',
  })
  contentType!: string;

  @ApiProperty({
    description: 'Timestamp when the file was uploaded',
    example: '2023-01-01T12:00:00Z',
  })
  lastModified!: Date;

  @ApiPropertyOptional({
    description: 'URL to access the file (if applicable)',
    example: 'https://example.com/storage/images/profile.jpg',
  })
  url?: string;
}
