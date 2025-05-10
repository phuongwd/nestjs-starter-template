import { registerAs } from '@nestjs/config';

/**
 * Subscription configuration structure
 */
export interface SubscriptionConfig {
  freePlan: {
    memberLimit: number;
  };
  trial: {
    duration: number; // in days
    memberLimit: number;
  };
}

/**
 * Subscription configuration provider
 * Manages subscription plans and limits configuration
 *
 * @example
 * ```typescript
 * // Access in a service
 * @Injectable()
 * class MyService {
 *   constructor(private configService: ConfigService) {
 *     const subscriptionConfig = this.configService.get<SubscriptionConfig>('subscription');
 *     const freePlanMemberLimit = subscriptionConfig.freePlan.memberLimit;
 *   }
 * }
 * ```
 */
export const subscriptionConfig = registerAs(
  'subscription',
  (): SubscriptionConfig => ({
    freePlan: {
      memberLimit: parseInt(process.env.FREE_PLAN_MEMBER_LIMIT ?? '5', 10),
    },
    trial: {
      duration: parseInt(process.env.TRIAL_DURATION_DAYS ?? '14', 10),
      memberLimit: parseInt(process.env.TRIAL_MEMBER_LIMIT ?? '10', 10),
    },
  }),
);

export default subscriptionConfig;
