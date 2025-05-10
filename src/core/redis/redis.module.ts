import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * Global Redis module providing Redis client access
 *
 * This module provides a global Redis service using node-redis.
 * It's marked as @Global() so the RedisService is available throughout the application.
 *
 * Configuration is handled via environment variables:
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 *
 * Usage in other modules:
 * ```typescript
 * // No need to import RedisModule due to @Global()
 * constructor(private readonly redisService: RedisService) {}
 * ```
 *
 * Choose between redis vs ioredis:
 * - redis (current): Better for basic operations, modern API, better TypeScript
 * - ioredis: Better for clustering, sentinel, complex operations
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
