import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsValidPassword } from '@/core/decorators/password-validation.decorator';

/**
 * DTO for updating a user's password
 */
export class UpdatePasswordDto {
  @ApiProperty({
    description: 'Current password for verification',
    example: 'currentPassword123',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'New password to set',
    example: 'newPassword123',
  })
  @IsValidPassword()
  @IsString()
  newPassword!: string;

  @ApiProperty({
    description: 'Confirmation of the new password',
    example: 'newPassword123',
  })
  @IsString()
  confirmPassword!: string;
}
