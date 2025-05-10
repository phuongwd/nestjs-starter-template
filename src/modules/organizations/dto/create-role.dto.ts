import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Name of the role',
    example: 'billing_manager',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the role',
    example: 'Can manage billing and subscriptions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'List of permission names to assign to the role',
    example: ['subscription:view', 'subscription:update_status'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  permissions!: string[];
}
