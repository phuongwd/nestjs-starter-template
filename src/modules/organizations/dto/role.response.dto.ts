import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PermissionResponse {
  @ApiProperty({
    description: 'Permission name',
    example: 'subscription:view',
  })
  name!: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'Can view subscription information',
  })
  description!: string;

  @ApiProperty({
    description: 'Resource type',
    example: 'subscription',
  })
  resourceType!: string;

  @ApiProperty({
    description: 'Action type',
    example: 'view',
  })
  action!: string;
}

export class RoleResponseDto {
  @ApiProperty({
    description: 'Role ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Role name',
    example: 'billing_manager',
  })
  name!: string;

  @ApiPropertyOptional({
    description: 'Role description',
    example: 'Can manage billing and subscriptions',
  })
  description?: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 1,
  })
  organizationId!: number;

  @ApiProperty({
    description: 'Whether this is a system role',
    example: false,
  })
  isSystemRole!: boolean;

  @ApiProperty({
    description: 'Role permissions',
    type: [PermissionResponse],
  })
  permissions!: PermissionResponse[];

  @ApiProperty({
    description: 'Creation timestamp',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
  })
  updatedAt!: Date;
}
