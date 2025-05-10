import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { IsValidPassword } from '@/core/decorators/password-validation.decorator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  /**
   * User's email address for authentication
   * @example "user@example.com"
   */
  email!: string;

  @IsValidPassword()
  /**
   * User's password must meet security requirements
   * @example "Admin@123456"
   */
  password!: string;
}
