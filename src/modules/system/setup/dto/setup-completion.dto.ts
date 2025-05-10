import { IsString, IsEmail, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { SetupCompletionData } from '../interfaces/setup-service.interface';
import { IsValidPassword } from '@/core/decorators/password-validation.decorator';

class MetadataObject {
  [key: string]: unknown;
}

/**
 * DTO for setup completion data
 * @description Validates and documents setup completion request data
 */
export class SetupCompletionDto implements SetupCompletionData {
  @ApiProperty({
    description: 'Admin user email',
    example: 'admin@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsValidPassword()
  password!: string;

  @ApiProperty({
    description: 'Admin user first name',
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({
    description: 'Admin user last name',
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiProperty({
    description: 'Setup token',
    example: 'a1b2c3d4e5f6...',
  })
  @IsString()
  @IsNotEmpty()
  setupToken!: string;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    type: MetadataObject,
  })
  @IsOptional()
  private _metadata?: Prisma.JsonValue;

  get metadata(): Record<string, unknown> | undefined {
    if (!this._metadata || this._metadata === null) {
      return undefined;
    }
    return this._metadata as Record<string, unknown>;
  }

  set metadata(value: Record<string, unknown> | undefined) {
    this._metadata = value as Prisma.JsonValue;
  }

  constructor(partial: Partial<SetupCompletionDto> = {}) {
    Object.assign(this, partial);
  }
}
