import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Data Transfer Object for creating a new access token
 *
 * @class CreateAccessTokenDto
 */
export class CreateAccessTokenDto {
  @ApiProperty({
    description: 'Name for the access token',
    example: 'My API Token',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    description: 'Optional description of the token purpose',
    example: 'Used for CI/CD pipeline',
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    description: 'Time-to-live in seconds (optional)',
    example: 2592000, // 30 days
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  ttl?: number;

  @ApiProperty({
    description: "Permission scopes (defaults to ['all'])",
    example: ['read', 'write'],
    required: false,
    type: [String],
    default: ['all'],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  scope?: string[];

  /**
   * These properties are set internally and not expected from requests
   */
  token?: string;
  expiresAt?: Date | null;
}

/**
 * Data Transfer Object for access token response
 *
 * @class AccessTokenResponseDto
 */
export class AccessTokenResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the token',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id!: string;

  @ApiProperty({
    description: 'User-friendly name for the token',
    example: 'My API Token',
  })
  name!: string;

  @ApiProperty({
    description: 'Optional description of the token purpose',
    example: 'Used for CI/CD pipeline',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'ID of the user who owns this token',
    example: '123',
  })
  userId!: string;

  @ApiProperty({
    description: 'When the token was created',
    example: '2023-06-15T10:30:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the token expires (null for no expiration)',
    example: '2023-07-15T10:30:00Z',
    required: false,
  })
  expiresAt?: Date | null;

  @ApiProperty({
    description: 'When the token was last used',
    example: '2023-06-16T14:25:00Z',
    required: false,
  })
  lastUsedAt?: Date | null;

  @ApiProperty({
    description: 'Array of permission scopes for this token',
    example: ['read', 'write'],
    type: [String],
  })
  scope!: string[];

  @ApiProperty({
    description: 'The actual token value (only included in creation response)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false,
  })
  token?: string;

  @ApiProperty({
    description: 'User-friendly display name',
    example: 'My API Token (550e8400)',
    required: false,
  })
  friendlyName?: string;

  @ApiProperty({
    description: 'Whether this is a temporary session token',
    example: false,
    required: false,
    default: false,
  })
  isSession?: boolean;
}

/**
 * Data Transfer Object for deleting an access token
 *
 * @class DeleteAccessTokenDto
 */
export class DeleteAccessTokenDto {
  @ApiProperty({
    description: 'ID or name of the token to delete',
    example: 'my-api-token',
  })
  @IsString()
  @IsNotEmpty()
  id!: string;
}
