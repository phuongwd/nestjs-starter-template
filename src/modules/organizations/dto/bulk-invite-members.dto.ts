import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { InviteMemberDto } from './invite-member.dto';

export class BulkInviteMembersDto {
  @ApiProperty({
    description: 'Array of member invitations',
    type: [InviteMemberDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => InviteMemberDto)
  invitations!: InviteMemberDto[];
}
