import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { IsValidPassword } from '@/core/decorators/password-validation.decorator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'user@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsValidPassword(true)
  @IsOptional()
  password?: string;

  @ApiPropertyOptional({
    example: 'John',
    description: 'User first name',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'User last name',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  lastName?: string;
}
