/**
 * Metadata for subscription payments
 */
export interface SubscriptionPaymentMetadata {
  type: 'subscription';
  /** The subscription ID */
  subscriptionId: string;
  /** The plan ID */
  planId: string;
  /** The billing period start date */
  periodStart: string;
  /** The billing period end date */
  periodEnd: string;
}

/**
 * Metadata for one-time payments
 */
export interface OneTimePaymentMetadata {
  type: 'one_time';
  /** The order ID if applicable */
  orderId?: string;
  /** The product ID if applicable */
  productId?: string;
  /** The purpose of the payment */
  purpose: string;
}

/**
 * Metadata for upgrade/downgrade payments
 */
export interface PlanChangePaymentMetadata {
  type: 'plan_change';
  /** The old subscription ID */
  oldSubscriptionId: string;
  /** The new subscription ID */
  newSubscriptionId: string;
  /** The old plan ID */
  oldPlanId: string;
  /** The new plan ID */
  newPlanId: string;
  /** The prorated amount if applicable */
  proratedAmount?: number;
}

/**
 * Union type of all possible payment metadata types
 */
export type PaymentMetadata =
  | SubscriptionPaymentMetadata
  | OneTimePaymentMetadata
  | PlanChangePaymentMetadata;
