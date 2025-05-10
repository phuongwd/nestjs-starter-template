import { registerAs } from '@nestjs/config';

/**
 * Feature flags configuration structure
 */
export interface FeatureFlagsConfig {
  email: {
    enabled: boolean;
    provider: string | 'none';
    requireConfiguration: boolean;
  };
  customDomains: {
    enabled: boolean;
    allowWildcard: boolean;
    allowSSL: boolean;
    provider: 'letsencrypt' | 'none';
    requireConfiguration: boolean;
  };
  // Add other feature flags here as needed
  // Example:
  // notifications: {
  //   enabled: boolean;
  //   providers: string[];
  // };
}

/**
 * Helper function to parse boolean environment variables
 * Handles 'true', true, 1, 'yes', 'on' as true values
 * @param value The environment variable value
 * @param defaultValue The default value if not set
 * @returns boolean
 */
const parseBooleanEnv = (
  value: string | undefined,
  defaultValue = false,
): boolean => {
  if (value === undefined) return defaultValue;
  return ['true', 'yes', 'on', '1'].includes(value.toLowerCase());
};

/**
 * Feature flags configuration
 * Controls which features are enabled/disabled in the application
 *
 * @example
 * ```typescript
 * // Access in a service
 * @Injectable()
 * class MyService {
 *   constructor(private configService: ConfigService) {
 *     const features = this.configService.get<FeatureFlagsConfig>('features');
 *     if (features.email.enabled) {
 *       // Do something with email
 *     }
 *   }
 * }
 * ```
 */
export const featureFlagsConfig = registerAs(
  'features',
  (): FeatureFlagsConfig => {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return {
      email: {
        enabled: parseBooleanEnv(process.env.FEATURE_EMAIL_ENABLED, true),
        provider: process.env.EMAIL_PROVIDER?.toLowerCase() || 'smtp',
        // In development, we don't require email configuration
        requireConfiguration: !isDevelopment,
      },
      customDomains: {
        enabled: parseBooleanEnv(process.env.FEATURE_CUSTOM_DOMAINS_ENABLED),
        allowWildcard: parseBooleanEnv(
          process.env.FEATURE_CUSTOM_DOMAINS_WILDCARD,
        ),
        allowSSL: parseBooleanEnv(process.env.FEATURE_CUSTOM_DOMAINS_SSL),
        provider: (process.env.CUSTOM_DOMAINS_SSL_PROVIDER?.toLowerCase() ||
          'none') as 'letsencrypt' | 'none',
        // In development, we don't require custom domain configuration
        requireConfiguration: !isDevelopment,
      },
    };
  },
);
