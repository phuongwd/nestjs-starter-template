/**
 * Interface for cached storage metadata
 */
export interface StorageMetadataCache {
  /**
   * Content type of the file
   */
  contentType: string;

  /**
   * Size of the file in bytes
   */
  size: number;

  /**
   * When the file was last modified
   */
  lastModified: Date;

  /**
   * ETag for cache validation
   */
  etag?: string;

  /**
   * Custom metadata associated with the file
   */
  custom: Record<string, string | number | boolean | null>;

  /**
   * When this cache entry was created
   */
  cachedAt: Date;
}

/**
 * Interface for cached directory listings
 */
export interface StorageListingCache {
  /**
   * List of items in the directory
   */
  items: {
    path: string;
    isDirectory: boolean;
    size?: number;
    lastModified?: Date;
    contentType?: string;
  }[];

  /**
   * When this cache entry was created
   */
  cachedAt: Date;
}

/**
 * Interface for cached file existence
 */
export interface StorageExistenceCache {
  /**
   * Whether the file exists
   */
  exists: boolean;

  /**
   * When this cache entry was created
   */
  cachedAt: Date;
}
