import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum SubscriptionNoteType {
  PAYMENT_VERIFICATION = 'PAYMENT_VERIFICATION',
  CUSTOMER_COMMUNICATION = 'CUSTOMER_COMMUNICATION',
  FRAUD_CHECK = 'FRAUD_CHECK',
  REFUND = 'REFUND',
  GENERAL = 'GENERAL',
}

export class AddSubscriptionNoteDto {
  @ApiProperty({
    description: 'Administrative note about the subscription',
    example: 'Payment received via PayPal. Transaction ID: ABC123',
  })
  @IsString()
  @IsNotEmpty()
  note!: string;

  @ApiProperty({
    description: 'Type of administrative note',
    enum: SubscriptionNoteType,
    example: SubscriptionNoteType.PAYMENT_VERIFICATION,
  })
  @IsEnum(SubscriptionNoteType)
  type!: SubscriptionNoteType;
}
