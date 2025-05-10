import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for creating a custom domain
 */
export class CreateCustomDomainDto {
  @ApiProperty({
    description: 'The domain name to add (e.g., example.com)',
    example: 'example.com',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    {
      message: 'Invalid domain name format',
    },
  )
  domain!: string;
}
