import { registerAs } from '@nestjs/config';
import apiConfig from './api.config';
import subscriptionConfig from './subscription.config';
import { featureFlagsConfig } from './feature-flags.config';
import emailConfig from './email.config';

/**
 * Type-safe application configuration structure
 */
export interface AppConfig {
  port: number;
  api: ReturnType<typeof apiConfig>;
  subscription: ReturnType<typeof subscriptionConfig>;
  features: ReturnType<typeof featureFlagsConfig>;
  email: ReturnType<typeof emailConfig>;
}

/**
 * Application configuration aggregator
 * Combines all module-specific configurations into a single configuration object.
 *
 * Configuration hierarchy:
 * ├── app
 * │   ├── port                    # Application port
 * │   ├── api                     # API-specific configuration
 * │   │   ├── currentVersion     # Current API version
 * │   │   ├── prefix            # API route prefix
 * │   │   ├── deprecatedVersions # List of deprecated API versions
 * │   │   └── supportedVersions  # List of supported API versions
 * │   ├── subscription           # Subscription-specific configuration
 * │   │   ├── freePlan          # Free plan limits
 * │   │   │   ├── memberLimit   # Maximum members allowed
 * │   │   └── trial             # Trial period settings
 * │   │       ├── duration      # Trial duration in days
 * │   │       └── memberLimit   # Maximum members during trial
 * │   ├── features              # Feature flags configuration
 * │   │   └── email            # Email feature settings
 * │   │       ├── enabled      # Whether email feature is enabled
 * │   │       ├── provider     # Email provider to use
 * │   │       └── requireConfig # Whether configuration is required
 * │   ├── email                # Email configuration
 */
export const appConfig = registerAs('app', (): AppConfig => {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    api: apiConfig(),
    subscription: subscriptionConfig(),
    features: featureFlagsConfig(),
    email: emailConfig(),
  };
});

export default appConfig;
