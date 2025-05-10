import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentResult,
} from '../interfaces/payment-provider.interface';
import { PaymentMetadata } from '../types/payment-metadata.types';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: PaymentProvider;

  constructor(private readonly configService: ConfigService) {
    this.provider = this.initializeProvider();
  }

  private initializeProvider(): PaymentProvider {
    const providerType =
      this.configService.get<string>('PAYMENT_PROVIDER') ?? 'manual';

    // Here we can add more providers as needed
    switch (providerType.toLowerCase()) {
      case 'stripe':
        // Stripe provider not implemented yet
        this.logger.warn(
          'Stripe provider not implemented, falling back to manual provider',
        );
        return this.createManualProvider();
      case 'paypal':
        // PayPal provider not implemented yet
        this.logger.warn(
          'PayPal provider not implemented, falling back to manual provider',
        );
        return this.createManualProvider();
      case 'manual':
      default:
        return this.createManualProvider();
    }
  }

  private createManualProvider(): PaymentProvider {
    return {
      validatePaymentMethod: async () => true,
      processPayment: async (amount, currency, paymentMethodId, metadata) => {
        this.logger.log(
          `Manual payment processing: ${amount} ${currency} with method ${paymentMethodId}`,
          metadata,
        );
        return {
          success: true,
          transactionId: `manual_${Date.now()}`,
        };
      },
      refundPayment: async (transactionId, amount) => {
        this.logger.log(
          `Manual refund processing: ${transactionId} amount: ${amount}`,
        );
        return {
          success: true,
          transactionId: `refund_${transactionId}`,
        };
      },
      createSubscription: async (customerId, planId, paymentMethodId) => {
        this.logger.log(
          `Manual subscription creation: ${customerId} plan: ${planId} method: ${paymentMethodId}`,
        );
        return `manual_sub_${Date.now()}`;
      },
      cancelSubscription: async (subscriptionId) => {
        this.logger.log(`Manual subscription cancellation: ${subscriptionId}`);
        return true;
      },
      updateSubscription: async (subscriptionId, newPlanId) => {
        this.logger.log(
          `Manual subscription update: ${subscriptionId} new plan: ${newPlanId}`,
        );
        return true;
      },
    };
  }

  async processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    metadata?: PaymentMetadata,
  ): Promise<PaymentResult> {
    try {
      return await this.provider.processPayment(
        amount,
        currency,
        paymentMethodId,
        metadata,
      );
    } catch (error) {
      this.logger.error(
        `Payment processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return {
        success: false,
        error: 'Payment processing failed',
      };
    }
  }

  async createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId: string,
  ): Promise<string> {
    return this.provider.createSubscription(
      customerId,
      planId,
      paymentMethodId,
    );
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    return this.provider.cancelSubscription(subscriptionId);
  }

  async updateSubscription(
    subscriptionId: string,
    newPlanId: string,
  ): Promise<boolean> {
    return this.provider.updateSubscription(subscriptionId, newPlanId);
  }

  /**
   * Validate a payment method
   */
  async validatePaymentMethod(paymentMethodId: string): Promise<boolean> {
    return this.provider.validatePaymentMethod(paymentMethodId);
  }
}
