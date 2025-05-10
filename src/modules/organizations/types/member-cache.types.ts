/**
 * Metrics for cache performance monitoring
 * Used by MemberCacheService to track cache effectiveness
 */
export interface CacheMetrics {
  /** Number of cache hits */
  hits: number;

  /** Number of cache misses */
  misses: number;

  /** Average cache retrieval time in milliseconds */
  avgRetrievalTime: number;

  /** Cache hit rate as a percentage string (e.g., "75.5%") */
  hitRate: string;
}
