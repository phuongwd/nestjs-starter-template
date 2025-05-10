import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';

export class InviteMemberDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address of the user to invite',
  })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    example: ['member', 'project_manager'],
    description: 'Role names to assign to the invited member',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleNames?: string[];

  @ApiPropertyOptional({
    example: 'Please join our organization',
    description: 'Custom message to include in the invitation',
  })
  @IsString()
  @IsOptional()
  customMessage?: string;
}
