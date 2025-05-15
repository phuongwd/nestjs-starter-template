import { StorageAcl } from './storage-provider.interface';

/**
 * Storage provider types
 */
export enum StorageProviderType {
  LOCAL = 'local',
  S3 = 's3',
  DO_SPACES = 'do_spaces',
  GITHUB = 'github',
}

/**
 * Base configuration for all storage providers
 */
export interface BaseStorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType;

  /**
   * Root path/prefix for all storage operations
   */
  rootPath?: string;

  /**
   * Default ACL for uploaded files
   */
  defaultAcl?: StorageAcl;

  /**
   * Maximum file size in bytes (0 for unlimited)
   */
  maxFileSize?: number;

  /**
   * Allowed MIME types (empty array for all types)
   */
  allowedMimeTypes?: string[];
}

/**
 * Local storage provider configuration
 */
export interface LocalStorageConfig extends BaseStorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType.LOCAL;

  /**
   * Base directory for file storage
   */
  directory: string;

  /**
   * Optional base URL for generating public URLs
   */
  baseUrl?: string;
}

/**
 * S3 storage provider configuration
 */
export interface S3StorageConfig extends BaseStorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType.S3;

  /**
   * AWS region for the S3 bucket
   */
  region: string;

  /**
   * S3 bucket name
   */
  bucket: string;

  /**
   * AWS access key ID
   */
  accessKeyId: string;

  /**
   * AWS secret access key
   */
  secretAccessKey: string;

  /**
   * Optional endpoint for using S3-compatible services
   */
  endpoint?: string;

  /**
   * Optional base URL for generating public URLs
   */
  baseUrl?: string;
}

/**
 * DigitalOcean Spaces storage provider configuration
 */
export interface DOSpacesStorageConfig extends BaseStorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType.DO_SPACES;

  /**
   * DigitalOcean region (e.g., 'nyc3', 'sgp1', etc.)
   */
  region: string;

  /**
   * Space name (bucket)
   */
  space: string;

  /**
   * DigitalOcean Spaces access key ID
   */
  accessKeyId: string;

  /**
   * DigitalOcean Spaces secret access key
   */
  secretAccessKey: string;

  /**
   * Optional CDN endpoint URL for the Space
   * Example: https://your-space-name.nyc3.cdn.digitaloceanspaces.com
   */
  cdnEndpoint?: string;

  /**
   * Optional custom domain for the Space
   * Example: https://assets.yourdomain.com
   */
  customDomain?: string;

  /**
   * Whether to use CDN endpoint for public URLs (default: true)
   */
  useCdn?: boolean;

  /**
   * Whether to force path-style endpoint (default: false)
   * Set to true if using custom domains
   */
  forcePathStyle?: boolean;
}

/**
 * GitHub repository storage provider configuration
 */
export interface GitHubStorageConfig extends BaseStorageConfig {
  /**
   * Provider type
   */
  type: StorageProviderType.GITHUB;

  /**
   * GitHub personal access token or OAuth token with repo scope
   */
  token: string;

  /**
   * GitHub repository owner (username or organization)
   */
  owner: string;

  /**
   * GitHub repository name
   */
  repo: string;

  /**
   * Default branch to use for storage operations (default: 'main')
   */
  branch?: string;

  /**
   * Optional base path within the repository
   */
  basePath?: string;

  /**
   * Whether to use the GitHub raw content URL for public URLs (default: true)
   */
  useRawUrl?: boolean;

  /**
   * Optional custom domain for GitHub Pages if enabled
   * Example: https://assets.yourdomain.com
   */
  customDomain?: string;
}

/**
 * Storage provider configuration
 */
export type StorageProviderConfig =
  | LocalStorageConfig
  | S3StorageConfig
  | DOSpacesStorageConfig
  | GitHubStorageConfig;

/**
 * Storage module configuration
 */
export interface StorageModuleConfig {
  /**
   * Default storage provider configuration
   */
  defaultProvider: StorageProviderConfig;

  /**
   * Default storage quota in bytes (0 for unlimited)
   */
  defaultQuota: number;

  /**
   * Cache TTL in milliseconds
   */
  cacheTtl: number;

  /**
   * Maximum concurrent uploads
   */
  maxConcurrentUploads: number;

  /**
   * Temporary directory for uploads
   */
  tempDir: string;
}
