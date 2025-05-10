import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis Service using IORedis for better type handling and complex operations
 *
 * This service provides a centralized Redis client for the application.
 * Uses node-redis (redis) package instead of ioredis for:
 * - Better TypeScript support
 * - Modern promise-based API
 * - Simpler implementation
 * - Better memory usage
 *
 * When to use this service:
 * 1. Caching (permissions, sessions, etc.)
 * 2. Rate limiting
 * 3. Simple pub/sub operations
 * 4. Basic key-value operations
 *
 * When to consider switching to ioredis:
 * 1. Need Redis Cluster support
 * 2. Need Sentinel support for high availability
 * 3. Need complex Redis operations (Lua scripts)
 * 4. Need more sophisticated connection management
 *
 * @example
 * ```typescript
 * // In your service
 * constructor(private readonly redisService: RedisService) {}
 *
 * async cacheData() {
 *   const client = this.redisService.getClient();
 *   await client.set('key', 'value', { EX: 3600 }); // 1 hour expiry
 *   const value = await client.get('key');
 * }
 * ```
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    // Common Redis options with improved resilience
    const redisOptions = {
      retryStrategy: (times: number) => {
        // More aggressive retry strategy with slower growth
        // Start with 200ms, cap at 5 seconds
        const delay = Math.min(200 * Math.pow(1.1, times), 5000);

        // Log only on significant retry milestones to reduce log spam
        if (times === 1 || times % 5 === 0 || times === 30) {
          this.logger.warn(
            `Redis connection retry attempt ${times} with delay ${delay}ms`,
          );
        }

        // After 30 attempts (about 2-3 minutes with this strategy), stop retrying
        if (times > 30) {
          this.logger.error(
            'Redis connection failed after 30 retry attempts. Giving up.',
          );
          return null; // Stop retrying
        }

        return delay;
      },
      maxRetriesPerRequest: 5, // Increased from 3 to 5 for more resilience
      connectTimeout: 5000, // Reduced from 10s to 5s for faster failure detection
      enableReadyCheck: true, // Enable ready check for better connection status detection
      enableOfflineQueue: true, // Enable offline queue to handle commands during reconnection
      // Add a command timeout to prevent hanging commands
      commandTimeout: 3000, // Reduced from 5s to 3s to fail faster
      // Add a more specific reconnect condition
      reconnectOnError: (err: Error) => {
        const targetErrors = [
          'READONLY',
          'ETIMEDOUT',
          'ECONNRESET',
          'ECONNREFUSED',
          'connection lost',
          'timed out',
          'Connection is closed',
          'Connection lost',
          'Socket closed',
          'NOAUTH',
        ];
        for (const errText of targetErrors) {
          if (err.message.includes(errText)) {
            this.logger.warn(`Redis reconnecting due to error: ${errText}`);
            return true;
          }
        }
        return false;
      },
      // Add a connection name for better debugging
      connectionName: 'nanoe-api',
      // Add a keep-alive setting to prevent idle disconnects
      keepAlive: 5000, // Reduced from 10s to 5s for more frequent keep-alive
      // Add auto-pipelining to reduce network overhead
      enableAutoPipelining: true,
      // Enable auto-reconnect on network errors
      autoResubscribe: true,
      // Enable auto-resending of failed commands
      autoResendUnfulfilledCommands: true,
      // Add a shorter socket timeout
      socketKeepAlive: true,
      // Retry time limit in milliseconds
      retryTimeoutLimit: 10000,
      // Reconnect after close
      reconnectAfterClose: true,
      // Disable auto-pipelining for more reliable connections
      enableOfflineQueuePipelining: false,
      // Set a shorter retry delay
      retryDelayOnFailover: 100,
      // Set a shorter retry delay for reconnection
      retryDelayOnClusterDown: 100,
      // Set a shorter retry delay for reconnection
      retryDelayOnTryAgain: 100,
      // Set a shorter retry delay for reconnection
      retryDelayOnMoved: 100,
    };

    // Check if REDIS_URL is provided (used in cloud environments like Render)
    const redisUrl = this.configService.get<string>('REDIS_URL');

    // Add a flag to track if we've seen a successful connection
    let hasConnectedBefore = false;
    let connectionAttempts = 0;

    try {
      if (redisUrl) {
        // Connect using REDIS_URL
        this.logger.log('Initializing Redis connection using REDIS_URL');

        // Parse the URL to extract components for better error messages
        try {
          const url = new URL(redisUrl);
          this.logger.log(
            `Redis host: ${url.hostname}, port: ${url.port || '6379'}`,
          );
        } catch (error) {
          this.logger.warn(
            `Could not parse REDIS_URL for logging: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }

        this.client = new Redis(redisUrl, redisOptions);
      } else {
        // Fall back to REDIS_HOST and REDIS_PORT
        const host = this.configService.getOrThrow<string>('REDIS_HOST');
        const port = this.configService.getOrThrow<number>('REDIS_PORT');
        const password = this.configService.get<string>('REDIS_PASSWORD');

        this.logger.log(`Initializing Redis connection to ${host}:${port}`);

        const options = {
          ...redisOptions,
          host,
          port,
          ...(password ? { password } : {}),
        };

        this.client = new Redis(options);
      }

      // Set up event handlers
      this.client.on('error', (err) => {
        // Only log detailed errors if they're not connection-related or if they're new
        if (
          (!err.message.includes('ECONNREFUSED') &&
            !err.message.includes('timed out')) ||
          !hasConnectedBefore ||
          connectionAttempts % 10 === 0
        ) {
          this.logger.error(`Redis Client Error: ${err.message}`);
        }

        // If we get a critical error, try to force reconnect
        if (
          err.message.includes('Reached the max retries per request limit') ||
          err.message.includes('ECONNRESET')
        ) {
          this.scheduleReconnect();
        }
      });

      this.client.on('connect', () => {
        hasConnectedBefore = true;
        connectionAttempts = 0;
        this.logger.log('Redis connection established');

        // Clear any pending reconnect timers
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.client.on('reconnecting', () => {
        connectionAttempts++;
        // Only log reconnection attempts occasionally to reduce spam
        if (!hasConnectedBefore || connectionAttempts % 10 === 0) {
          this.logger.log('Redis reconnecting...');
        }
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready and operational');

        // Perform a simple ping to verify the connection is working
        this.client
          .ping()
          .then(() => {
            this.logger.log('Redis PING successful');
          })
          .catch((_: unknown) => {
            // Using underscore to avoid linter error for unused variable
            this.logger.error('Redis PING failed');
          });
      });

      // Add additional event handlers for better diagnostics
      this.client.on('end', () => {
        this.logger.warn('Redis connection ended');
        this.scheduleReconnect();
      });

      this.client.on('close', () => {
        this.logger.warn('Redis connection closed');
        this.scheduleReconnect();
      });

      // Add a more frequent periodic health check
      this.healthCheckInterval = setInterval(() => {
        if (this.client.status === 'ready') {
          this.client.ping().catch((_: unknown) => {
            // Using underscore to avoid linter error for unused variable
            this.logger.warn('Periodic health check failed');
            this.scheduleReconnect();
          });
        } else if (
          this.client.status !== 'connecting' &&
          this.client.status !== 'reconnecting'
        ) {
          this.logger.warn(
            `Redis client status: ${this.client.status}, attempting reconnect`,
          );
          this.scheduleReconnect();
        }
      }, 15000); // Every 15 seconds
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to initialize Redis: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Schedule a reconnect attempt if not already scheduled
   * @private
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return; // Already scheduled
    }

    this.reconnectTimer = setTimeout(() => {
      this.logger.log('Attempting forced reconnect to Redis');
      try {
        // Force reconnect by quitting and creating a new connection
        this.client.quit().catch((_: unknown) => {
          // Using underscore to avoid linter error for unused variable
          this.logger.warn('Error while quitting Redis client');
        });

        // Reset the timer
        this.reconnectTimer = null;
      } catch (error) {
        this.logger.error(
          `Error during forced reconnect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        this.reconnectTimer = null;
      }
    }, 5000); // Wait 5 seconds before attempting reconnect
  }

  /**
   * Get the Redis client instance
   *
   * @returns {Redis} The Redis client instance
   *
   * @example
   * ```typescript
   * // Basic operations
   * const client = redisService.getClient();
   * await client.set('key', 'value');
   *
   * // With expiry
   * await client.set('key', 'value', { EX: 3600 });
   *
   * // Complex operations
   * await client.hSet('hash', { field1: 'value1', field2: 'value2' });
   * ```
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Check if Redis is connected and ready
   * @returns {Promise<boolean>} True if Redis is connected and ready
   */
  async isReady(): Promise<boolean> {
    try {
      // More robust health check with timeout
      const pingPromise = this.client.ping();

      // Create a timeout promise
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(() => reject(new Error('Redis ping timeout')), 2000); // 2s timeout
      });

      // Race the ping against the timeout
      await Promise.race([pingPromise, timeoutPromise]);
      return true;
    } catch {
      // Removed the unused parameter to fix linter error
      return false;
    }
  }

  /**
   * Store a value with automatic serialization
   * @param key - The key to store the value under
   * @param value - The value to store (will be JSON serialized)
   * @param ttlMs - Optional TTL in milliseconds
   * @throws {Error} If serialization or storage fails
   */
  async set(key: string, value: unknown, ttlMs?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlMs) {
        await this.client.set(key, serialized, 'PX', ttlMs);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      this.logger.error(
        `Error setting key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get a value with automatic deserialization
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(
        `Error getting key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      this.logger.error(
        `Error deleting key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Gracefully close the Redis connection when the module is destroyed
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection due to module destruction');

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      // Check if client exists and is not already closed
      if (this.client && this.client.status !== 'end') {
        await this.client.quit();
        this.logger.log('Redis connection closed gracefully');
      }
    } catch (error) {
      this.logger.error(
        `Error closing Redis connection: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
