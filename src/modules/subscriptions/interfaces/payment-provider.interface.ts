import { PaymentMetadata } from '../types/payment-metadata.types';

export interface PaymentMethodInfo {
  id: string;
  type: string;
  last4?: string;
  expiryMonth?: number;
  expiryYear?: number;
  holderName?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

export interface PaymentProvider {
  /**
   * Validate a payment method
   */
  validatePaymentMethod(paymentMethodId: string): Promise<boolean>;

  /**
   * Process a payment with strongly typed metadata
   */
  processPayment(
    amount: number,
    currency: string,
    paymentMethodId: string,
    metadata?: PaymentMetadata,
  ): Promise<PaymentResult>;

  /**
   * Refund a payment
   */
  refundPayment(transactionId: string, amount?: number): Promise<PaymentResult>;

  /**
   * Create a subscription
   */
  createSubscription(
    customerId: string,
    planId: string,
    paymentMethodId: string,
  ): Promise<string>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string): Promise<boolean>;

  /**
   * Update subscription plan
   */
  updateSubscription(
    subscriptionId: string,
    newPlanId: string,
  ): Promise<boolean>;
}
