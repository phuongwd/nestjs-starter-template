import { registerAs } from '@nestjs/config';

/**
 * API configuration structure
 */
export interface ApiConfig {
  currentVersion: string;
  prefix: string;
  deprecatedVersions: string[];
  supportedVersions: string[];
}

/**
 * API configuration provider
 * Manages API versioning and routing configuration
 *
 * @example
 * ```typescript
 * // Access in a service
 * @Injectable()
 * class MyService {
 *   constructor(private configService: ConfigService) {
 *     const apiConfig = this.configService.get<ApiConfig>('api');
 *     const currentVersion = apiConfig.currentVersion;
 *   }
 * }
 * ```
 */
export const apiConfig = registerAs(
  'api',
  (): ApiConfig => ({
    currentVersion: process.env.API_VERSION || '1',
    prefix: process.env.API_PREFIX || 'api/v',
    deprecatedVersions: (process.env.API_DEPRECATED_VERSIONS || '')
      .split(',')
      .filter(Boolean),
    supportedVersions: (process.env.API_SUPPORTED_VERSIONS || '1,2')
      .split(',')
      .filter(Boolean),
  }),
);

export default apiConfig;
