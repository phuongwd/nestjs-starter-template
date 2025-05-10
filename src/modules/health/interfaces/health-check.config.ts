/**
 * Configuration interface for health checks
 */
export interface HealthCheckConfig {
  database: {
    timeoutMs: number;
    retryIntervalMs: number;
    maxRetries: number;
  };
  memory: {
    heapUsedThresholdMb: number;
    rssThresholdMb: number;
  };
  disk: {
    pathToCheck: string;
    thresholdPercent: number;
  };
}

/**
 * Default configuration for health checks
 */
export const DEFAULT_HEALTH_CONFIG: HealthCheckConfig = {
  database: {
    timeoutMs: 1000, // 1 second timeout for database operations
    retryIntervalMs: 1000, // 1 second between retries
    maxRetries: 3, // Maximum number of retries for database operations
  },
  memory: {
    heapUsedThresholdMb: 512, // 512MB heap usage threshold
    rssThresholdMb: 1024, // 1GB RSS memory threshold
  },
  disk: {
    pathToCheck: '/', // Root path to check disk space
    thresholdPercent: 90, // Alert when disk usage is above 90%
  },
};
