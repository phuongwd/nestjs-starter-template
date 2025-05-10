import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

/**
 * DTO for creating a system role
 */
export class CreateSystemRoleDto {
  @ApiProperty({
    description: 'The name of the system role',
    example: 'SYSTEM_ADMIN',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Description of the system role',
    example: 'System Administrator with full access',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Array of permission keys',
    example: ['*'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  permissions!: string[];
}
