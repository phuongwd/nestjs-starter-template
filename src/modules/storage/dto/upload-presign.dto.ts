import { IsString, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { StorageAcl } from '../interfaces/storage-provider.interface';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadPresignDto {
  @ApiProperty({
    description: 'file name to stored to the bucket',
    example: 'profile.jpg',
  })
  @IsString()
  fileName!: string;

  @ApiProperty({
    description: 'hashed file md5',
    enum: StorageAcl,
    example: StorageAcl.PUBLIC_READ,
  })
  @IsNotEmpty()
  @IsString()
  hashedFile!: string;

  @IsNotEmpty()
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    description: 'Access control level for the file',
    enum: StorageAcl,
    example: StorageAcl.PUBLIC_READ,
  })
  @IsEnum(StorageAcl)
  @IsOptional()
  acl?: StorageAcl;

  @ApiPropertyOptional({
    description: 'Storage provider to use (if not using default)',
    example: 's3',
  })
  @IsString()
  @IsOptional()
  provider?: string;
}
