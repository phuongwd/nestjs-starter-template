import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PlanFeatures } from '../types/plan-features.types';

export enum BillingType {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  ONE_TIME = 'ONE_TIME',
}

export class CreatePlanDto {
  @ApiProperty({
    example: 'Professional Plan',
    description: 'Name of the subscription plan',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    example: 'Perfect for growing businesses',
    description: 'Detailed description of the plan',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    type: () => PlanFeatures,
    example: {
      maxUsers: 10,
      maxProjects: 20,
      features: ['api_access', 'premium_support'],
    },
    description: 'Features and limits included in the plan',
  })
  @ValidateNested()
  @Type(() => PlanFeatures)
  features!: PlanFeatures;

  @ApiProperty({
    example: 99.99,
    description: 'Price of the plan',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  price!: number;

  @ApiProperty({
    enum: BillingType,
    example: BillingType.MONTHLY,
    description: 'Billing frequency for the plan',
  })
  @IsEnum(BillingType)
  billingType!: BillingType;

  @ApiProperty({
    example: 'MONTHLY',
    description: 'Billing interval (month, year, one_time)',
  })
  @IsString()
  interval!: string;

  @ApiProperty({
    example: 10,
    description: 'Maximum number of members allowed in this plan',
  })
  @IsNumber()
  memberLimit!: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the plan is active and available for subscription',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
