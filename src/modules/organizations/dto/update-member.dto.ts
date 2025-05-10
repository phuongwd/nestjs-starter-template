import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { MemberStatus } from '../../../shared/types/permission.types';

export class UpdateMemberDto {
  @ApiPropertyOptional({
    enum: MemberStatus,
    description: 'Member status in the organization',
  })
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @ApiPropertyOptional({
    example: ['member', 'project_manager'],
    description: 'Role names to assign to the member',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  roleNames?: string[];
}
