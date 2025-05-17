/**
 * Interface for storage providers that handle file operations
 * All storage implementations (Local, S3, DigitalOcean Spaces) must implement this interface
 */

import { UploadPresignDto } from '@/modules/storage/dto/upload-presign.dto';

export interface StorageProvider {
  /**
   * Upload a file to storage
   * @param options Upload configuration options
   * @returns Promise with upload result
   */
  upload(options: UploadOptions): Promise<StorageResult>;
  presign?(dto: UploadPresignDto): Promise<PresignResult>;

  /**
   * Download a file from storage
   * @param path Path to the file
   * @returns Promise with download result
   */
  download(path: string): Promise<DownloadResult>;

  /**
   * Delete a file from storage
   * @param path Path to the file
   * @returns Promise resolving when deletion is complete
   */
  delete(path: string): Promise<void>;

  /**
   * Check if a file exists in storage
   * @param path Path to the file
   * @returns Promise resolving to boolean indicating existence
   */
  exists(path: string): Promise<boolean>;

  /**
   * List files in storage with optional prefix
   * @param prefix Optional path prefix to filter results
   * @returns Promise with array of storage items
   */
  list(prefix?: string): Promise<StorageItem[]>;

  /**
   * Get metadata for a file
   * @param path Path to the file
   * @returns Promise with file metadata
   */
  getMetadata(path: string): Promise<StorageMetadata>;

  /**
   * Update metadata for a file
   * @param path Path to the file
   * @param metadata Partial metadata to update
   * @returns Promise with updated metadata
   */
  updateMetadata(
    path: string,
    metadata: Partial<StorageMetadata>,
  ): Promise<StorageMetadata>;
}

/**
 * Storage access control level
 */
export enum StorageAcl {
  PRIVATE = 'private',
  PUBLIC_READ = 'public-read',
  PUBLIC_READ_WRITE = 'public-read-write',
  AUTHENTICATED_READ = 'authenticated-read',
}

/**
 * Upload options for storage operations
 */
export interface UploadOptions {
  /**
   * Path where the file should be stored
   */
  path: string;

  /**
   * File content as Buffer or ReadableStream
   */
  content: Buffer | NodeJS.ReadableStream;

  /**
   * Content type (MIME type) of the file
   */
  contentType?: string;

  /**
   * Access control level for the file
   */
  acl?: StorageAcl;

  /**
   * Custom metadata to store with the file
   */
  metadata?: Record<string, string>;
}

/**
 * Result of a successful storage operation
 */
export interface StorageResult {
  /**
   * Path where the file was stored
   */
  path: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * MIME type of the file
   */
  contentType: string;

  /**
   * Timestamp when the file was created/modified
   */
  lastModified: Date;

  /**
   * URL to access the file (if applicable)
   */
  url?: string;

  /**
   * File metadata
   */
  metadata: StorageMetadata;
}

export interface PresignResult {
  presignUrl: string;
  uploadToken?: string;
}

/**
 * Result of a file download operation
 */
export interface DownloadResult {
  /**
   * File content as a readable stream
   */
  content: NodeJS.ReadableStream;

  /**
   * MIME type of the file
   */
  contentType: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * File metadata
   */
  metadata: StorageMetadata;
}

/**
 * Metadata for a stored file
 */
export interface StorageMetadata {
  /**
   * MIME type of the file
   */
  contentType: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * Timestamp when the file was created
   */
  createdAt: Date;

  /**
   * Timestamp when the file was last modified
   */
  lastModified: Date;

  /**
   * ETag or other hash of the file content
   */
  etag?: string;

  /**
   * Custom metadata as key-value pairs
   */
  custom: Record<string, string>;
}

/**
 * Represents a file or directory in storage
 */
export interface StorageItem {
  /**
   * Path to the item
   */
  path: string;

  /**
   * Whether the item is a directory
   */
  isDirectory: boolean;

  /**
   * Size of the file in bytes (0 for directories)
   */
  size: number;

  /**
   * Timestamp when the item was last modified
   */
  lastModified: Date;

  /**
   * MIME type of the file (undefined for directories)
   */
  contentType?: string;
}
