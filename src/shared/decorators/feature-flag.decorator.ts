import { SetMetadata } from '@nestjs/common';
import { FeatureFlagsConfig } from '@config/feature-flags.config';

export const FEATURE_FLAG_KEY = 'featureFlag';

/**
 * Decorator to mark a route or method as requiring a specific feature flag
 * @param feature The feature flag key to check
 * @returns Decorator function
 *
 * @example
 * ```typescript
 * @FeatureFlag('customDomains')
 * async addDomain() {
 *   // This will only execute if customDomains feature is enabled
 * }
 * ```
 */
export const FeatureFlag = (feature: keyof FeatureFlagsConfig) =>
  SetMetadata(FEATURE_FLAG_KEY, feature);
