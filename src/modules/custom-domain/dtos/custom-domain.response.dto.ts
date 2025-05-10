import { ApiProperty } from '@nestjs/swagger';
import { CustomDomain, DomainStatus } from '@prisma/client';

/**
 * Response DTO for custom domain operations
 */
export class CustomDomainResponseDto {
  @ApiProperty({
    description: 'The domain ID',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The domain name',
    example: 'example.com',
  })
  domain: string;

  @ApiProperty({
    description: 'The organization ID that owns this domain',
    example: 1,
  })
  organizationId: number;

  @ApiProperty({
    description: 'The domain verification status',
    enum: DomainStatus,
    example: DomainStatus.PENDING,
  })
  status: DomainStatus;

  @ApiProperty({
    description: 'The verification token for DNS TXT record',
    example: 'abc123',
    required: false,
    nullable: true,
  })
  verificationToken: string | null;

  @ApiProperty({
    description: 'When the domain was verified',
    example: '2024-02-20T06:10:06.000Z',
    required: false,
    nullable: true,
  })
  verifiedAt: Date | null;

  @ApiProperty({
    description: 'When the domain was created',
    example: '2024-02-20T06:10:06.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the domain was last updated',
    example: '2024-02-20T06:10:06.000Z',
  })
  updatedAt: Date;

  constructor(domain: CustomDomain) {
    this.id = domain.id;
    this.domain = domain.domain;
    this.organizationId = domain.organizationId;
    this.status = domain.status;
    this.verificationToken = domain.verificationToken;
    this.verifiedAt = domain.verifiedAt;
    this.createdAt = domain.createdAt;
    this.updatedAt = domain.updatedAt;
  }
}
