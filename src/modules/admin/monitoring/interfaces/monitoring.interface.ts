/**
 * System metrics data structure
 */
export interface SystemMetrics {
  totalUsers: number;
  activeAdminSessions: number;
  pendingSetupTokens: number;
  recentFailedLogins: number;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response structure
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}
