import { SetupToken, SetupAudit, Prisma } from '@prisma/client';

/**
 * Data required to create a setup token
 */
export interface CreateSetupTokenData {
  token: string;
  expiresAt: Date;
  createdByIp: string;
  environment: string;
  fingerprint?: string | null;
  metadata?: Prisma.JsonValue;
}

/**
 * Data required to create a setup audit entry
 */
export interface CreateSetupAuditData {
  tokenId: string;
  action: string;
  ip: string;
  success: boolean;
  error?: string;
  metadata?: Prisma.JsonValue;
}

/**
 * Repository interface for setup token operations
 */
export interface ISetupTokenRepository {
  /**
   * Create a new setup token
   * @param data Token creation data
   */
  createToken(data: CreateSetupTokenData): Promise<SetupToken>;

  /**
   * Find a token by its value
   * @param token Token string to find
   */
  findByToken(token: string): Promise<SetupToken | null>;

  /**
   * Mark a token as used
   * @param id Token ID
   * @param usedByIp IP address that used the token
   */
  markAsUsed(id: string, usedByIp: string): Promise<SetupToken>;

  /**
   * Create an audit entry for a token
   * @param data Audit entry data
   */
  createAuditEntry(data: CreateSetupAuditData): Promise<SetupAudit>;
}
