import { IsNumber, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Represents the features and limits included in a subscription plan
 */
export class PlanFeatures {
  @ApiProperty({
    example: 10,
    description: 'Maximum number of users allowed',
  })
  @IsNumber()
  maxUsers!: number;

  @ApiProperty({
    example: 20,
    description: 'Maximum number of projects allowed',
  })
  @IsNumber()
  maxProjects!: number;

  @ApiProperty({
    example: ['api_access', 'premium_support'],
    description: 'List of enabled features',
  })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum storage space in GB',
  })
  @IsNumber()
  @IsOptional()
  maxStorageGB?: number;

  @ApiPropertyOptional({
    example: 1000,
    description: 'Maximum API calls per day',
  })
  @IsNumber()
  @IsOptional()
  maxApiCallsPerDay?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether premium support is included',
  })
  @IsOptional()
  hasPremiumSupport?: boolean;
}
