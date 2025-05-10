import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateSubscriptionDto {
  @ApiProperty({
    example: 1,
    description: 'ID of the plan to subscribe to',
  })
  @IsNumber()
  planId!: number;

  @ApiPropertyOptional({
    example: '2024-12-31T23:59:59Z',
    description: 'Optional trial end date',
  })
  @IsDateString()
  @IsOptional()
  trialEndsAt?: string;

  @ApiPropertyOptional({
    example: 'pm_1234567890',
    description: 'Payment method ID from the payment provider',
  })
  @IsString()
  @IsOptional()
  paymentMethodId?: string;
}
