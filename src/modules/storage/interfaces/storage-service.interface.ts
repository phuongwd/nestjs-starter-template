import {
  UploadOptions,
  StorageResult,
  DownloadResult,
  StorageItem,
  StorageMetadata,
  PresignResult,
} from './storage-provider.interface';
import { StorageModuleConfig } from './storage-config.interface';
import { UploadPresignDto } from '@/modules/storage/dto/upload-presign.dto';

/**
 * @interface IStorageService
 * @description Service contract for storage operations
 *
 * Requirements:
 * - Must handle provider management
 * - Must handle organization context
 * - Must implement error handling
 * - Must enforce quotas
 */
export interface IStorageService {
  presign(
    dot: UploadPresignDto,
    organizationId?: string,
  ): Promise<PresignResult>;

  /**
   * Upload a file to storage
   * @param options Upload options
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with upload result
   */
  uploadFile(
    options: UploadOptions,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageResult>;

  /**
   * Download a file from storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with download result
   */
  downloadFile(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<DownloadResult>;

  /**
   * Delete a file from storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise resolving when deletion is complete
   */
  deleteFile(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise resolving to boolean indicating existence
   */
  fileExists(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<boolean>;

  /**
   * List files in storage with optional prefix
   * @param prefix Optional path prefix to filter results
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with array of storage items
   */
  listFiles(
    prefix?: string,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageItem[]>;

  /**
   * Get metadata for a file
   * @param path Path to the file
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with file metadata
   */
  getFileMetadata(
    path: string,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageMetadata>;

  /**
   * Update metadata for a file
   * @param path Path to the file
   * @param metadata Metadata to update
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with updated file metadata
   */
  updateFileMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
    organizationId?: string,
    provider?: string,
  ): Promise<StorageMetadata>;

  /**
   * Get storage usage statistics
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @returns Promise with storage usage statistics
   */
  getStorageUsage(organizationId?: string): Promise<{
    used: number;
    limit: number;
    percentage: number;
  }>;

  /**
   * Get the storage configuration
   * @returns Storage module configuration
   */
  getConfig(): StorageModuleConfig;

  /**
   * Generate a signed URL for direct file access
   * @param path Path to the file
   * @param expirationMs Optional expiration time in milliseconds
   * @param organizationId Optional organization ID for multi-tenant isolation
   * @param provider Optional provider name to use (if not using default)
   * @returns Promise with the signed URL
   */
  generateSignedUrl(
    path: string,
    expirationMs?: number,
    organizationId?: string,
    provider?: string,
  ): Promise<string>;
}
