import {
  StorageMetadata,
  UploadOptions,
  StorageAcl,
} from './storage-provider.interface';

/**
 * Extended upload options for DO Spaces
 */
export interface DOSpacesUploadOptions extends UploadOptions {
  /**
   * Optional cache control header
   */
  cacheControl?: string;

  /**
   * Optional content disposition header
   */
  contentDisposition?: string;

  /**
   * Optional CDN cache TTL in seconds
   */
  cdnCacheTtl?: number;
}

/**
 * Extended metadata for DO Spaces objects
 */
export interface DOSpacesMetadata extends StorageMetadata {
  /**
   * DO Spaces ETag
   */
  etag: string;

  /**
   * Object ACL
   */
  acl?: StorageAcl;

  /**
   * CDN cache TTL in seconds
   */
  cdnCacheTtl?: number;

  /**
   * CDN URL if available
   */
  cdnUrl?: string;

  /**
   * Custom domain URL if configured
   */
  customDomainUrl?: string;
}
