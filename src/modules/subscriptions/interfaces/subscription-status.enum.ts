/**
 * @enum SubscriptionStatus
 * @description Defines the possible states of a subscription
 */
export enum SubscriptionStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  ACTIVE = 'ACTIVE',
  PAYMENT_OVERDUE = 'PAYMENT_OVERDUE',
  CANCELLED = 'CANCELLED',
  TRIAL = 'TRIAL',
}
