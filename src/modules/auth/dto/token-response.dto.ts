import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, IsNotEmpty } from 'class-validator';

/**
 * Response DTO for token operations
 * @description Contains the JWT access token and its expiration time
 */
export class TokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  accessToken!: string;

  @ApiProperty({
    description: 'Token expiration in seconds',
    example: 900, // 15 minutes
  })
  @IsNumber()
  @IsPositive()
  expiresIn!: number;

  constructor(data: Partial<Omit<TokenResponseDto, 'constructor'>>) {
    if (data.accessToken) this.accessToken = data.accessToken;
    if (data.expiresIn) this.expiresIn = data.expiresIn;
  }
}
