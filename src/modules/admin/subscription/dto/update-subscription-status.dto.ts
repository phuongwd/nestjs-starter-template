import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SubscriptionStatus } from '@/modules/subscriptions/interfaces/subscription-status.enum';

export class UpdateSubscriptionStatusDto {
  @ApiProperty({
    enum: SubscriptionStatus,
    description: 'New status for the subscription',
  })
  @IsEnum(SubscriptionStatus)
  status!: SubscriptionStatus;

  @ApiProperty({
    description: 'Payment method used (PAYPAL, WISE)',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({
    description: 'Payment reference number',
    required: false,
  })
  @IsString()
  @IsOptional()
  paymentReference?: string;

  @ApiProperty({
    description: 'Date when payment was received',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  lastPaymentDate?: string;

  @ApiProperty({
    description: 'Expected date of next payment',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  nextPaymentDate?: string;
}
