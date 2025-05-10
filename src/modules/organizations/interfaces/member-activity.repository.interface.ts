import { ActivityMetadata } from '../types/activity-metadata.types';

/**
 * Interface for member activity repository operations
 */
export interface IMemberActivityRepository {
  /**
   * Track a member activity
   */
  trackActivity(
    organizationId: number,
    memberId: number,
    action: string,
    metadata: ActivityMetadata,
  ): Promise<void>;

  /**
   * Create a member activity record
   */
  create(data: {
    organizationId: number;
    memberId: number;
    action: string;
    metadata: ActivityMetadata;
  }): Promise<void>;

  /**
   * Get member activities with pagination
   */
  getActivities(
    organizationId: number,
    memberId: number,
    page?: number,
    limit?: number,
  ): Promise<{
    activities: Array<{
      id: number;
      organizationId: number;
      memberId: number;
      action: string;
      metadata: ActivityMetadata | null;
      createdAt: Date;
      updatedAt: Date;
    }>;
    total: number;
    page: number;
    totalPages: number;
  }>;
}
