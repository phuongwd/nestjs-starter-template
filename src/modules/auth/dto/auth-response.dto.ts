import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { UserWithoutPasswordResponse } from '../../users/types/user.type';

/**
 * Response DTO for authentication operations
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({
    description: 'JWT refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;

  @ApiProperty({
    description: 'User information',
    type: UserWithoutPasswordResponse,
  })
  @ValidateNested()
  @Type(() => UserWithoutPasswordResponse)
  user!: UserWithoutPasswordResponse;

  constructor(data: Partial<Omit<AuthResponseDto, 'constructor'>>) {
    if (data.accessToken) this.accessToken = data.accessToken;
    if (data.refreshToken) this.refreshToken = data.refreshToken;
    if (data.user) this.user = data.user;
  }
}
