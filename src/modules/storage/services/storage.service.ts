import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  StorageProvider,
  UploadOptions,
  StorageResult,
  DownloadResult,
  StorageItem,
  StorageMetadata,
} from '../interfaces/storage-provider.interface';
import { StorageModuleConfig } from '../interfaces/storage-config.interface';
import {
  StorageQuotaExceededError,
  StorageConfigurationError,
} from '../utils/storage-errors';
import { IStorageService } from '../interfaces/storage-service.interface';
import { IStorageProviderFactory } from '../interfaces/storage-provider-factory.interface';
import { INJECTION_TOKENS } from '../constants/injection-tokens';
import { StorageCacheService } from './storage-cache.service';

/**
 * @class StorageService
 * @implements {IStorageService}
 * @description Main service for storage operations
 * Handles provider management, organization context, and quota enforcement
 *
 * Usage:
 * ```typescript
 * @Inject(INJECTION_TOKENS.SERVICE.STORAGE)
 * private readonly storageService: IStorageService
 * ```
 */
@Injectable()
export class StorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly providers = new Map<string, StorageProvider>();
  private defaultProvider: StorageProvider;
  private config: StorageModuleConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly cacheService: StorageCacheService,
    @Inject(INJECTION_TOKENS.FACTORY.STORAGE_PROVIDER)
    private readonly providerFactory: IStorageProviderFactory,
  ) {
    // Initialize with empty values, will be set in onModuleInit
    this.defaultProvider = null as unknown as StorageProvider;
    this.config = null as unknown as StorageModuleConfig;
  }

  /**
   * Initialize storage providers on module initialization
   */
  async onModuleInit(): Promise<void> {
    this.logger.log(
      'Initializing storage service',
      undefined,
      'StorageService',
    );

    try {
      // Load configuration
      this.config = this.loadConfig();

      // Initialize default provider
      this.defaultProvider = this.providerFactory.createProvider(
        this.config.defaultProvider,
      );
      // this.providers.set('default', this.defaultProvider);
      this.providers.set(
        this.configService.get<string>('STORAGE_PROVIDER') || 'default',
        this.defaultProvider,
      );

      this.logger.log(
        'Storage service initialized successfully',
        undefined,
        'StorageService',
      );
    } catch (error) {
      this.logger.error(
        'Failed to initialize storage service',
        error instanceof Error ? error.stack : String(error),
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Upload a file to storage
   * @param options Upload options
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with upload result
   */
  public async uploadFile(
    options: UploadOptions,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageResult> {
    const storageProvider = this.getProvider(provider);
    const path = this.getPathWithOrganization(options.path, organizationId);

    // Check quota if organization is provided
    if (organizationId) {
      const fileSize = this.getContentSize(options.content);
      await this.checkQuota(organizationId, fileSize);
    }

    try {
      const result = await storageProvider.upload({
        ...options,
        path,
      });

      // Update usage metrics
      if (organizationId) {
        await this.updateUsageMetrics(organizationId, result.size);
      }

      return result;
    } catch (error) {
      this.logger.error('Failed to upload file', {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the size of the content to be uploaded
   * @param content File content as Buffer or ReadableStream
   * @returns Size in bytes
   */
  private getContentSize(content: Buffer | NodeJS.ReadableStream): number {
    if (Buffer.isBuffer(content)) {
      return content.length;
    }

    // For streams, we need to check if it has a size property
    const stream = content as { size?: number };
    if (typeof stream.size === 'number') {
      return stream.size;
    }

    // If we can't determine the size, throw an error
    throw new StorageConfigurationError(
      'Cannot determine file size for quota check. Please provide content as Buffer or a stream with size property.',
    );
  }

  /**
   * Check if the organization has enough quota for the file
   * @param organizationId Organization ID
   * @param fileSize File size in bytes
   * @throws StorageQuotaExceededError if quota would be exceeded
   */
  private async checkQuota(
    organizationId: string,
    fileSize: number,
  ): Promise<void> {
    const usage = await this.getStorageUsage(organizationId);
    const quota = usage.limit;

    // Skip check if quota is 0 (unlimited)
    if (quota === 0) {
      return;
    }

    const newUsage = usage.used + fileSize;
    if (newUsage > quota) {
      throw new StorageQuotaExceededError(organizationId, quota, fileSize);
    }
  }

  /**
   * Get storage usage statistics
   * @param _organizationId Optional organization ID for multi-tenant isolation
   * @returns Promise with storage usage statistics
   */
  public async getStorageUsage(_organizationId?: string): Promise<{
    used: number;
    limit: number;
    percentage: number;
  }> {
    try {
      // TODO: Implement actual usage tracking
      // This should be implemented based on your metrics storage solution
      // For now, return dummy values
      const defaultQuota = this.configService.get<number>(
        'storage.defaultQuota',
        0,
      );
      const used = 0; // Replace with actual usage from metrics storage

      return {
        used,
        limit: defaultQuota,
        percentage: defaultQuota === 0 ? 0 : (used / defaultQuota) * 100,
      };
    } catch (error) {
      this.logger.error(
        'Failed to get storage usage',
        error instanceof Error ? error.stack : String(error),
        'StorageService',
      );
      throw error;
    }
  }

  /**
   * Update organization storage usage metrics
   * @param organizationId Organization ID
   * @param sizeDelta Size change in bytes (positive for additions, negative for deletions)
   */
  private async updateUsageMetrics(
    organizationId: string,
    sizeDelta: number,
  ): Promise<void> {
    try {
      // TODO: Implement usage metrics update
      // This should be implemented based on your metrics storage solution
      // For example, using a database or metrics service
      this.logger.debug(
        'Updating storage usage metrics',
        `organizationId=${organizationId} sizeDelta=${sizeDelta} provider=default`,
        'StorageService',
      );
    } catch (error) {
      // Log but don't throw - metrics updates shouldn't block storage operations
      this.logger.error(
        'Failed to update storage usage metrics',
        error instanceof Error ? error.stack : String(error),
        'StorageService',
      );
    }
  }

  /**
   * Download a file from storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with download result
   */
  public async downloadFile(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<DownloadResult> {
    const storageProvider = this.getProvider(provider);
    const fullPath = this.getPathWithOrganization(path, organizationId);

    try {
      return await storageProvider.download(fullPath);
    } catch (error) {
      this.logger.error('Failed to download file', {
        path: fullPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete a file from storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise resolving when deletion is complete
   */
  public async deleteFile(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<void> {
    const fullPath = this.getPathWithOrganization(path, organizationId);

    try {
      const storageProvider = this.getProvider(provider);

      // Get file metadata to know the size before deletion
      let fileSize = 0;
      if (organizationId) {
        try {
          const metadata = await storageProvider.getMetadata(fullPath);
          fileSize = metadata.size;
        } catch (error) {
          this.logger.warn(
            'Failed to get file size for metrics update during deletion',
            {
              path: fullPath,
              error: error instanceof Error ? error.message : String(error),
            },
          );
        }
      }

      // Delete the file
      await storageProvider.delete(fullPath);

      // Update organization metrics with negative size delta
      if (organizationId && fileSize > 0) {
        await this.updateUsageMetrics(organizationId, -fileSize);
      }

      // Invalidate all caches for this path
      await this.cacheService.invalidate(fullPath);
    } catch (error) {
      this.logger.error('Failed to delete file', {
        path: fullPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if a file exists in storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise resolving to boolean indicating existence
   */
  public async fileExists(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<boolean> {
    const fullPath = this.getPathWithOrganization(path, organizationId);

    try {
      // Check cache first
      const cached = await this.cacheService.getExistence(fullPath);
      if (cached) {
        return cached.exists;
      }

      // If not in cache, check storage
      const storageProvider = this.getProvider(provider);
      const exists = await storageProvider.exists(fullPath);

      // Cache the result
      await this.cacheService.cacheExistence(fullPath, exists);

      return exists;
    } catch (error) {
      this.logger.error('Failed to check if file exists', {
        path: fullPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * List files in storage with optional prefix
   * @param prefix Optional path prefix to filter results
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with array of storage items
   */
  public async listFiles(
    prefix?: string,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageItem[]> {
    const fullPrefix = this.getPathWithOrganization(
      prefix || '',
      organizationId,
    );

    try {
      // Check cache first
      const cached = await this.cacheService.getListing(fullPrefix);
      if (cached) {
        return cached.items as StorageItem[];
      }

      // If not in cache, get from storage
      const storageProvider = this.getProvider(provider);
      const items = await storageProvider.list(fullPrefix);

      // Cache the result
      await this.cacheService.cacheListing(fullPrefix, {
        items,
        cachedAt: new Date(),
      });

      return items;
    } catch (error) {
      this.logger.error('Failed to list files', {
        prefix: fullPrefix,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get metadata for a file
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with file metadata
   */
  public async getFileMetadata(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageMetadata> {
    const fullPath = this.getPathWithOrganization(path, organizationId);

    try {
      // Check cache first
      const cached = await this.cacheService.getMetadata(fullPath);
      if (cached) {
        // Convert cached metadata to StorageMetadata
        const metadata: StorageMetadata = {
          contentType: cached.contentType,
          size: cached.size,
          lastModified: cached.lastModified,
          createdAt: new Date(), // Default for cached entries
          etag: cached.etag,
          custom: cached.custom as Record<string, string>,
        };
        return metadata;
      }

      // If not in cache, get from storage
      const storageProvider = this.getProvider(provider);
      const metadata = await storageProvider.getMetadata(fullPath);

      // Cache the result
      await this.cacheService.cacheMetadata(fullPath, {
        contentType: metadata.contentType,
        size: metadata.size,
        lastModified: metadata.lastModified,
        etag: metadata.etag,
        custom: metadata.custom,
        cachedAt: new Date(),
      });

      return metadata;
    } catch (error) {
      this.logger.error('Failed to get file metadata', {
        path: fullPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update metadata for a file
   * @param path Path to the file
   * @param metadata Metadata to update
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with updated file metadata
   */
  public async updateFileMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageMetadata> {
    const fullPath = this.getPathWithOrganization(path, organizationId);

    try {
      const storageProvider = this.getProvider(provider);
      const updatedMetadata = await storageProvider.updateMetadata(
        fullPath,
        metadata,
      );

      // Update cache
      await this.cacheService.cacheMetadata(fullPath, {
        contentType: updatedMetadata.contentType,
        size: updatedMetadata.size,
        lastModified: updatedMetadata.lastModified,
        etag: updatedMetadata.etag,
        custom: updatedMetadata.custom,
        cachedAt: new Date(),
      });

      return updatedMetadata;
    } catch (error) {
      this.logger.error('Failed to update file metadata', {
        path: fullPath,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get the storage configuration
   * @returns Storage module configuration
   */
  public getConfig(): StorageModuleConfig {
    return this.config;
  }

  /**
   * Load storage module configuration
   * @private
   * @returns Storage module configuration
   */
  private loadConfig(): StorageModuleConfig {
    const config = this.configService.get<StorageModuleConfig>('storage');
    if (!config) {
      throw new StorageConfigurationError('Storage configuration is required');
    }
    if (!config.defaultProvider) {
      throw new StorageConfigurationError(
        'Default storage provider configuration is required',
      );
    }
    return config;
  }

  /**
   * Get a storage provider by name
   * @private
   * @param name Provider name (optional)
   * @returns Storage provider instance
   */
  private getProvider(name?: string): StorageProvider {
    if (!name) {
      return this.defaultProvider;
    }

    console.log('this.providers', this.providers);
    const provider = this.providers.get(name);
    if (!provider) {
      throw new StorageConfigurationError(`Provider not found: ${name}`);
    }

    return provider;
  }

  /**
   * Get path with organization prefix for multi-tenant isolation
   * @private
   * @param path Original path
   * @param organizationId Organization ID (optional)
   * @returns Path with organization prefix
   */
  private getPathWithOrganization(
    path: string,
    organizationId?: string,
  ): string {
    if (!organizationId) {
      return path;
    }

    // Ensure path doesn't start with slash
    const normalizedPath = path.startsWith('/') ? path.substring(1) : path;

    // Add organization prefix
    return `organizations/${organizationId}/${normalizedPath}`;
  }

  /**
   * Generate a signed URL for direct file access
   * @param path Path to the file
   * @param expirationMs Optional expiration time in milliseconds (default: 1 hour)
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with the signed URL
   */
  public async generateSignedUrl(
    path: string,
    expirationMs = 3600000,
    organizationId?: string,
    provider?: string,
  ): Promise<string> {
    this.logger.debug(
      `Generating signed URL for ${path} (expires in ${expirationMs}ms)`,
    );

    try {
      // Get the appropriate provider
      const storageProvider = this.getProvider(provider);

      // Construct the path with organization context if needed
      const fullPath = this.getPathWithOrganization(path, organizationId);

      // Check if provider supports presigned URLs
      if (
        typeof (
          storageProvider as unknown as {
            generatePresignedUrl?: (
              path: string,
              expiresIn: number,
            ) => Promise<string>;
          }
        ).generatePresignedUrl === 'function'
      ) {
        // Provider supports presigned URLs, use it
        const expiresIn = Math.floor(expirationMs / 1000); // Convert to seconds
        return (
          storageProvider as unknown as {
            generatePresignedUrl(
              path: string,
              expiresIn: number,
            ): Promise<string>;
          }
        ).generatePresignedUrl(fullPath, expiresIn);
      }

      // Check if file exists before returning a fallback URL
      const exists = await storageProvider.exists(fullPath);
      if (!exists) {
        throw new Error(`File not found at ${fullPath}`);
      }

      // If provider doesn't support presigned URLs, return a fallback URL
      // This is useful for local development or simple storage providers
      const appBaseUrl = this.configService.get<string>(
        'APP_BASE_URL',
        'http://localhost:3000',
      );

      // Construct a fallback URL pointing to the storage service API
      return `${appBaseUrl}/api/v1/storage/files/${encodeURIComponent(fullPath)}?expires=${
        Date.now() + expirationMs
      }`;
    } catch (error) {
      this.logger.error(
        `Failed to generate signed URL for ${path}: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
