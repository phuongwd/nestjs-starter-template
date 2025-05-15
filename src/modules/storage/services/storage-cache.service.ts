import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@core/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import {
  StorageMetadataCache,
  StorageListingCache,
  StorageExistenceCache,
} from '../interfaces/storage-cache.interface';
import {
  StorageMetadata,
  StorageItem,
} from '../interfaces/storage-provider.interface';

/**
 * Configuration for selective caching
 */
interface CachingConfig {
  maxSize: number; // Maximum file size to cache in bytes
  allowedTypes: string[]; // List of content types to cache
  excludedTypes: string[]; // List of content types to never cache
  listingMaxItems: number; // Maximum number of items in a directory listing to cache
  metadataTTL: number; // TTL for metadata cache in milliseconds
  listingTTL: number; // TTL for directory listing cache in milliseconds
  existenceTTL: number; // TTL for existence cache in milliseconds
}

/**
 * Service for caching storage metadata and lookups
 * Implements a selective caching strategy based on file types and sizes
 */
@Injectable()
export class StorageCacheService {
  private readonly logger = new Logger(StorageCacheService.name);
  private readonly METADATA_PREFIX = 'storage:metadata:';
  private readonly LISTING_PREFIX = 'storage:listing:';
  private readonly EXISTENCE_PREFIX = 'storage:exists:';
  private readonly cachingConfig: CachingConfig;
  private readonly cache = new Map<string, StorageMetadataCache>();
  private readonly listCache = new Map<
    string,
    { items: StorageItem[]; cachedAt: Date }
  >();

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    // Initialize caching configuration from environment or use defaults
    this.cachingConfig = {
      maxSize: this.config.get<number>(
        'STORAGE_CACHE_MAX_SIZE',
        10 * 1024 * 1024,
      ), // 10MB
      allowedTypes: this.config
        .get<string>('STORAGE_CACHE_ALLOWED_TYPES', '')
        .split(',')
        .filter(Boolean)
        .map((type) => type.trim()),
      excludedTypes: [
        'video/',
        'application/x-msdownload',
        'application/x-binary',
      ],
      listingMaxItems: this.config.get<number>(
        'STORAGE_CACHE_MAX_LISTING_ITEMS',
        1000,
      ),
      metadataTTL:
        this.config.get<number>('STORAGE_CACHE_METADATA_TTL', 3600) * 1000, // 1 hour
      listingTTL:
        this.config.get<number>('STORAGE_CACHE_LISTING_TTL', 300) * 1000, // 5 minutes
      existenceTTL:
        this.config.get<number>('STORAGE_CACHE_EXISTENCE_TTL', 60) * 1000, // 1 minute
    };
  }

  /**
   * Determine if a file's metadata should be cached based on its properties
   */
  private shouldCacheMetadata(metadata: StorageMetadataCache): boolean {
    // Always cache small files
    if (metadata.size <= 1024 * 100) {
      // 100KB
      return true;
    }

    // Check file size
    if (metadata.size > this.cachingConfig.maxSize) {
      return false;
    }

    // Check content type
    const contentType = metadata.contentType.toLowerCase();

    // Never cache excluded types
    if (
      this.cachingConfig.excludedTypes.some((type) =>
        contentType.startsWith(type),
      )
    ) {
      return false;
    }

    // If allowed types are specified, only cache those
    if (this.cachingConfig.allowedTypes.length > 0) {
      return this.cachingConfig.allowedTypes.some((type) =>
        contentType.startsWith(type),
      );
    }

    // Default to caching if no specific allowed types
    return true;
  }

  /**
   * Determine if a directory listing should be cached based on its properties
   */
  private shouldCacheListing(listing: StorageListingCache): boolean {
    return listing.items.length <= this.cachingConfig.listingMaxItems;
  }

  /**
   * Cache file metadata if it meets caching criteria
   */
  async cacheMetadata(
    path: string,
    metadata: StorageMetadataCache,
    ttl?: number,
  ): Promise<void> {
    try {
      if (!this.shouldCacheMetadata(metadata)) {
        this.logger.debug(`Skipping cache for ${path} due to caching rules`);
        return;
      }

      const key = this.getMetadataKey(path);
      const effectiveTtl = ttl || this.cachingConfig.metadataTTL;

      await this.redis.set(
        key,
        {
          ...metadata,
          cachedAt: new Date(),
        },
        effectiveTtl,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache metadata for ${path}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cache directory listing if it meets caching criteria
   */
  async cacheListing(
    prefix: string,
    listing: StorageListingCache,
    ttl?: number,
  ): Promise<void> {
    try {
      if (!this.shouldCacheListing(listing)) {
        this.logger.debug(`Skipping cache for listing ${prefix} due to size`);
        return;
      }

      const key = this.getListingKey(prefix);
      const effectiveTtl = ttl || this.cachingConfig.listingTTL;

      await this.redis.set(
        key,
        {
          ...listing,
          cachedAt: new Date(),
        },
        effectiveTtl,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache listing for ${prefix}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Cache file existence with a short TTL
   */
  async cacheExistence(
    path: string,
    exists: boolean,
    ttl?: number,
  ): Promise<void> {
    try {
      const key = this.getExistenceKey(path);
      const effectiveTtl = ttl || this.cachingConfig.existenceTTL;

      await this.redis.set(
        key,
        {
          exists,
          cachedAt: new Date(),
        },
        effectiveTtl,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cache existence for ${path}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Get cached metadata if available
   */
  async getMetadata(path: string): Promise<StorageMetadataCache | null> {
    try {
      const key = this.getMetadataKey(path);
      const cached = await this.redis.get<StorageMetadataCache>(key);

      if (cached && !this.shouldCacheMetadata(cached)) {
        // If caching rules have changed, invalidate the cache
        await this.redis.del(key);
        return null;
      }

      return cached;
    } catch (error) {
      this.logger.error(
        `Failed to get cached metadata for ${path}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Get cached directory listing if available
   */
  async getListing(prefix: string): Promise<StorageListingCache | null> {
    try {
      const key = this.getListingKey(prefix);
      const cached = await this.redis.get<StorageListingCache>(key);

      if (cached && !this.shouldCacheListing(cached)) {
        // If caching rules have changed, invalidate the cache
        await this.redis.del(key);
        return null;
      }

      return cached;
    } catch (error) {
      this.logger.error(
        `Failed to get cached listing for ${prefix}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Get cached existence check if available
   */
  async getExistence(path: string): Promise<StorageExistenceCache | null> {
    try {
      return await this.redis.get<StorageExistenceCache>(
        this.getExistenceKey(path),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get cached existence for ${path}:`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }

  /**
   * Invalidate all caches for a path
   */
  async invalidate(path: string): Promise<void> {
    const keys = [
      this.getMetadataKey(path),
      this.getListingKey(path),
      this.getExistenceKey(path),
    ];

    try {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    } catch (error) {
      this.logger.error(
        `Failed to invalidate cache for ${path}:`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private getMetadataKey(path: string): string {
    return `${this.METADATA_PREFIX}${path}`;
  }

  private getListingKey(prefix: string): string {
    return `${this.LISTING_PREFIX}${prefix || 'root'}`;
  }

  private getExistenceKey(path: string): string {
    return `${this.EXISTENCE_PREFIX}${path}`;
  }

  /**
   * Get cached metadata for a file
   */
  public getCachedMetadata(path: string): StorageMetadataCache | undefined {
    return this.cache.get(path);
  }

  /**
   * Set cached metadata for a file
   */
  public setCachedMetadata(path: string, metadata: StorageMetadata): void {
    this.cache.set(path, {
      ...metadata,
      cachedAt: new Date(),
    });
  }

  /**
   * Get cached file listing for a prefix
   */
  public getCachedListing(prefix: string): StorageItem[] | undefined {
    const cached = this.listCache.get(prefix);
    if (!cached) return undefined;
    return cached.items;
  }

  /**
   * Set cached file listing for a prefix
   */
  public setCachedListing(prefix: string, items: StorageItem[]): void {
    this.listCache.set(prefix, {
      items,
      cachedAt: new Date(),
    });
  }

  /**
   * Clear cache for a specific path
   */
  public clearCache(path: string): void {
    this.cache.delete(path);
    // Also clear any list cache that might contain this path
    for (const [prefix] of this.listCache) {
      if (path.startsWith(prefix)) {
        this.listCache.delete(prefix);
      }
    }
  }

  /**
   * Clear all cache
   */
  public clearAllCache(): void {
    this.cache.clear();
    this.listCache.clear();
  }
}
