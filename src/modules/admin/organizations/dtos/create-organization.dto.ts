import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * DTO for creating a new organization through admin interface
 */
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'The name of the organization',
    example: 'Acme Corporation',
  })
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @ApiProperty({
    description: 'The unique slug for the organization',
    example: 'acme-corp',
  })
  @IsString()
  @IsNotEmpty()
  readonly slug!: string;

  @ApiProperty({
    description: 'Optional description of the organization',
    example: 'Leading provider of innovative solutions',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly description?: string;
}
