import { AdminSession } from '@prisma/client';

interface CreateSessionData {
  userId: number;
  token: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

/**
 * Interface for admin session repository operations
 */
export interface IAdminSessionRepository {
  /**
   * Create a new admin session
   */
  create(data: CreateSessionData): Promise<AdminSession>;

  /**
   * Find a session by token
   */
  findByToken(token: string): Promise<AdminSession | null>;

  /**
   * Find active sessions for a user
   */
  findActiveByUserId(userId: number): Promise<AdminSession[]>;

  /**
   * Update session activity timestamp
   */
  updateActivity(id: number): Promise<AdminSession>;

  /**
   * Revoke a session
   */
  revoke(token: string): Promise<void>;

  /**
   * Delete expired and revoked sessions
   */
  deleteExpiredAndRevoked(): Promise<number>;
}
