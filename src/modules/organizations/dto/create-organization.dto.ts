import {
  IsString,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  ValidateNested,
  IsHexColor,
  IsUrl,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrganizationThemeSettings {
  @IsHexColor()
  @IsOptional()
  primaryColor?: string;

  @IsUrl()
  @IsOptional()
  logo?: string;
}

export class OrganizationFeatureSettings {
  @IsBoolean()
  @IsOptional()
  enableChat?: boolean;

  @IsNumber()
  @IsOptional()
  maxUsers?: number;
}

export class OrganizationSettings {
  @ValidateNested()
  @Type(() => OrganizationThemeSettings)
  @IsOptional()
  theme?: OrganizationThemeSettings;

  @ValidateNested()
  @Type(() => OrganizationFeatureSettings)
  @IsOptional()
  features?: OrganizationFeatureSettings;
}

export class CreateOrganizationDto {
  @ApiProperty({
    example: 'Acme Corporation',
    description: 'Organization name (3-100 characters)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    example: 'acme-corp',
    description:
      'URL-friendly slug (3-50 characters, lowercase letters, numbers, and hyphens only)',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional({
    example: 'Leading provider of innovative solutions',
    description: 'Optional description of the organization',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

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
