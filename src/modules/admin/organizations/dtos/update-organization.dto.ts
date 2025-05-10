import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

/**
 * DTO for updating an organization through admin interface
 */
export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'The name of the organization',
    example: 'Acme Corporation',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly name?: string;

  @ApiProperty({
    description: 'The description of the organization',
    example: 'Leading provider of innovative solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly description?: string;
}
