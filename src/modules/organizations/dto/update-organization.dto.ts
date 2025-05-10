import {
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrganizationSettings } from './create-organization.dto';

export class UpdateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization name (3-100 characters)',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    example: 'acme-corp',
    description:
      'URL-friendly slug (3-50 characters, lowercase letters, numbers, and hyphens only)',
  })
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: {
      theme: {
        primaryColor: '#FF0000',
        logo: 'https://example.com/logo.png',
      },
      features: {
        enableChat: true,
        maxUsers: 100,
      },
    },
    description: 'Organization-specific settings and configurations',
    type: () => OrganizationSettings,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrganizationSettings)
  settings?: OrganizationSettings;
}
